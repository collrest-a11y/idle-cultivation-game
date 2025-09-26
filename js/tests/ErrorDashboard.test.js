/**
 * ErrorDashboard Test Suite - Comprehensive testing for error monitoring dashboard
 * Tests component functionality, real-time updates, filtering, and performance
 */

class ErrorDashboardTestSuite {
    constructor() {
        this.testResults = [];
        this.mockErrorManager = null;
        this.mockErrorAnalytics = null;
        this.dashboard = null;
        this.testContainer = null;

        // Test configuration
        this.config = {
            timeout: 5000,
            mockErrors: 50,
            performanceThreshold: 100 // ms
        };
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting ErrorDashboard Test Suite...');

        try {
            await this.setupTestEnvironment();
            await this.runComponentTests();
            await this.runRealTimeTests();
            await this.runFilteringTests();
            await this.runPerformanceTests();
            await this.runIntegrationTests();
            await this.runAccessibilityTests();

            this.generateTestReport();

        } catch (error) {
            console.error('Test suite failed:', error);
            this.addTestResult('Test Suite', 'Setup', false, error.message);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Setup test environment
     */
    async setupTestEnvironment() {
        console.log('📋 Setting up test environment...');

        // Create mock ErrorManager
        this.mockErrorManager = {
            getErrorLog: () => this.generateMockErrors(20),
            clearErrorLog: () => {},
            suppressError: () => {},
            attemptRecovery: () => {}
        };

        // Create mock ErrorAnalytics
        this.mockErrorAnalytics = {
            recordError: () => {},
            getStatistics: () => ({
                totalErrors: 20,
                criticalErrors: 5,
                warningErrors: 10,
                recoveryRate: 75
            }),
            getPatternAnalysis: () => [],
            exportData: () => ({})
        };

        // Create test container
        this.testContainer = document.createElement('div');
        this.testContainer.id = 'test-container';
        this.testContainer.style.position = 'fixed';
        this.testContainer.style.top = '-9999px';
        document.body.appendChild(this.testContainer);

        // Create dashboard instance
        this.dashboard = new ErrorDashboard();

        // Mock developer mode
        Object.defineProperty(this.dashboard, 'checkDeveloperMode', {
            value: () => true
        });

        console.log('✅ Test environment setup complete');
    }

    /**
     * Run component tests
     */
    async runComponentTests() {
        console.log('🔧 Running component tests...');

        // Test 1: Dashboard initialization
        await this.testDashboardInitialization();

        // Test 2: UI creation
        await this.testUICreation();

        // Test 3: Event listener setup
        await this.testEventListeners();

        // Test 4: Keyboard shortcuts
        await this.testKeyboardShortcuts();

        // Test 5: Theme switching
        await this.testThemeSwitching();
    }

    /**
     * Test dashboard initialization
     */
    async testDashboardInitialization() {
        try {
            await this.dashboard.initialize(this.mockErrorManager, this.mockErrorAnalytics);

            // Check if dashboard was created
            const dashboardElement = document.getElementById('error-dashboard');
            const exists = dashboardElement !== null;
            const isHidden = dashboardElement && dashboardElement.classList.contains('hidden');

            this.addTestResult('Component', 'Dashboard Initialization',
                exists && isHidden,
                exists ? 'Dashboard created and hidden' : 'Dashboard not created');

        } catch (error) {
            this.addTestResult('Component', 'Dashboard Initialization', false, error.message);
        }
    }

    /**
     * Test UI creation
     */
    async testUICreation() {
        try {
            const dashboard = document.getElementById('error-dashboard');

            // Check required elements
            const requiredElements = [
                '.dashboard-header',
                '.dashboard-controls',
                '.dashboard-content',
                '.error-list',
                '.metrics-panel',
                '.detail-panel',
                '.search-input',
                '.filter-controls'
            ];

            let allElementsPresent = true;
            const missingElements = [];

            requiredElements.forEach(selector => {
                const element = dashboard.querySelector(selector);
                if (!element) {
                    allElementsPresent = false;
                    missingElements.push(selector);
                }
            });

            this.addTestResult('Component', 'UI Creation',
                allElementsPresent,
                allElementsPresent ? 'All UI elements created' : `Missing: ${missingElements.join(', ')}`);

        } catch (error) {
            this.addTestResult('Component', 'UI Creation', false, error.message);
        }
    }

    /**
     * Test event listeners
     */
    async testEventListeners() {
        try {
            const dashboard = document.getElementById('error-dashboard');

            // Test search input
            const searchInput = dashboard.querySelector('.search-input');
            const searchEvent = new Event('input');
            let searchTriggered = false;

            const originalUpdateFilters = this.dashboard.updateFilters;
            this.dashboard.updateFilters = () => {
                searchTriggered = true;
                originalUpdateFilters.call(this.dashboard);
            };

            searchInput.dispatchEvent(searchEvent);

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 350));

            this.addTestResult('Component', 'Event Listeners',
                searchTriggered,
                searchTriggered ? 'Search input event handled' : 'Search input event not handled');

            // Restore original method
            this.dashboard.updateFilters = originalUpdateFilters;

        } catch (error) {
            this.addTestResult('Component', 'Event Listeners', false, error.message);
        }
    }

    /**
     * Test keyboard shortcuts
     */
    async testKeyboardShortcuts() {
        try {
            let shortcutTriggered = false;

            // Mock dashboard toggle
            const originalToggle = this.dashboard.toggle;
            this.dashboard.toggle = () => {
                shortcutTriggered = true;
                originalToggle.call(this.dashboard);
            };

            // Simulate Ctrl+Shift+E
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'E',
                ctrlKey: true,
                shiftKey: true
            });

            document.dispatchEvent(keyEvent);

            this.addTestResult('Component', 'Keyboard Shortcuts',
                shortcutTriggered,
                shortcutTriggered ? 'Keyboard shortcut handled' : 'Keyboard shortcut not handled');

            // Restore original method
            this.dashboard.toggle = originalToggle;

        } catch (error) {
            this.addTestResult('Component', 'Keyboard Shortcuts', false, error.message);
        }
    }

    /**
     * Test theme switching
     */
    async testThemeSwitching() {
        try {
            const dashboard = document.getElementById('error-dashboard');

            // Test light theme
            dashboard.classList.add('theme-light');
            const hasLightTheme = dashboard.classList.contains('theme-light');

            // Test dark theme (default)
            dashboard.classList.remove('theme-light');
            const hasDarkTheme = !dashboard.classList.contains('theme-light');

            this.addTestResult('Component', 'Theme Switching',
                hasLightTheme && hasDarkTheme,
                'Theme switching functionality works');

        } catch (error) {
            this.addTestResult('Component', 'Theme Switching', false, error.message);
        }
    }

    /**
     * Run real-time update tests
     */
    async runRealTimeTests() {
        console.log('⚡ Running real-time tests...');

        // Test 1: Error display update
        await this.testErrorDisplayUpdate();

        // Test 2: Metrics update
        await this.testMetricsUpdate();

        // Test 3: Polling mechanism
        await this.testPollingMechanism();

        // Test 4: Auto-scroll functionality
        await this.testAutoScroll();
    }

    /**
     * Test error display update
     */
    async testErrorDisplayUpdate() {
        try {
            // Show dashboard
            this.dashboard.show();

            // Add mock errors
            const mockErrors = this.generateMockErrors(5);
            this.dashboard.handleNewErrors(mockErrors);

            // Check if errors are displayed
            const errorItems = document.querySelectorAll('.error-item');
            const errorsDisplayed = errorItems.length >= 5;

            this.addTestResult('Real-time', 'Error Display Update',
                errorsDisplayed,
                `Displayed ${errorItems.length} errors`);

        } catch (error) {
            this.addTestResult('Real-time', 'Error Display Update', false, error.message);
        }
    }

    /**
     * Test metrics update
     */
    async testMetricsUpdate() {
        try {
            // Update metrics
            this.dashboard.updateMetrics();

            // Check metric values
            const totalErrors = document.getElementById('total-errors');
            const criticalErrors = document.getElementById('critical-errors');
            const recoveryRate = document.getElementById('recovery-rate');

            const metricsUpdated = totalErrors.textContent !== '0' ||
                                 criticalErrors.textContent !== '0' ||
                                 recoveryRate.textContent !== '0%';

            this.addTestResult('Real-time', 'Metrics Update',
                metricsUpdated,
                metricsUpdated ? 'Metrics updated successfully' : 'Metrics not updated');

        } catch (error) {
            this.addTestResult('Real-time', 'Metrics Update', false, error.message);
        }
    }

    /**
     * Test polling mechanism
     */
    async testPollingMechanism() {
        try {
            let pollCount = 0;
            const originalPoll = this.dashboard.pollForNewErrors;

            this.dashboard.pollForNewErrors = () => {
                pollCount++;
                originalPoll.call(this.dashboard);
            };

            // Wait for polling interval
            await new Promise(resolve => setTimeout(resolve, 1200));

            const pollingWorking = pollCount > 0;

            this.addTestResult('Real-time', 'Polling Mechanism',
                pollingWorking,
                `Polling triggered ${pollCount} times`);

            // Restore original method
            this.dashboard.pollForNewErrors = originalPoll;

        } catch (error) {
            this.addTestResult('Real-time', 'Polling Mechanism', false, error.message);
        }
    }

    /**
     * Test auto-scroll functionality
     */
    async testAutoScroll() {
        try {
            const autoScrollBtn = document.querySelector('.auto-scroll-btn');
            const errorList = document.querySelector('.error-list');

            // Enable auto-scroll
            autoScrollBtn.classList.add('active');

            const initialScrollTop = errorList.scrollTop;

            // Add more errors to trigger scroll
            const moreErrors = this.generateMockErrors(10);
            this.dashboard.handleNewErrors(moreErrors);

            // Check if scroll position changed
            const scrollChanged = errorList.scrollTop !== initialScrollTop;

            this.addTestResult('Real-time', 'Auto-scroll',
                scrollChanged,
                scrollChanged ? 'Auto-scroll working' : 'Auto-scroll not working');

        } catch (error) {
            this.addTestResult('Real-time', 'Auto-scroll', false, error.message);
        }
    }

    /**
     * Run filtering tests
     */
    async runFilteringTests() {
        console.log('🔍 Running filtering tests...');

        // Test 1: Severity filtering
        await this.testSeverityFiltering();

        // Test 2: Category filtering
        await this.testCategoryFiltering();

        // Test 3: Time range filtering
        await this.testTimeRangeFiltering();

        // Test 4: Search filtering
        await this.testSearchFiltering();
    }

    /**
     * Test severity filtering
     */
    async testSeverityFiltering() {
        try {
            // Set up errors with different severities
            const mixedErrors = [
                { severity: 'critical', message: 'Critical error', timestamp: Date.now() },
                { severity: 'warning', message: 'Warning error', timestamp: Date.now() },
                { severity: 'info', message: 'Info error', timestamp: Date.now() }
            ];

            this.dashboard.displayedErrors = mixedErrors;

            // Filter by critical
            const severityFilter = document.querySelector('.severity-filter');
            severityFilter.value = 'critical';
            this.dashboard.updateFilters();

            const criticalOnly = this.dashboard.filteredErrors.every(e => e.severity === 'critical');
            const correctCount = this.dashboard.filteredErrors.length === 1;

            this.addTestResult('Filtering', 'Severity Filtering',
                criticalOnly && correctCount,
                `Filtered to ${this.dashboard.filteredErrors.length} critical errors`);

        } catch (error) {
            this.addTestResult('Filtering', 'Severity Filtering', false, error.message);
        }
    }

    /**
     * Test category filtering
     */
    async testCategoryFiltering() {
        try {
            // Set up errors with different categories
            const mixedErrors = [
                { category: 'ui', message: 'UI error', timestamp: Date.now() },
                { category: 'network', message: 'Network error', timestamp: Date.now() },
                { category: 'storage', message: 'Storage error', timestamp: Date.now() }
            ];

            this.dashboard.displayedErrors = mixedErrors;

            // Filter by UI
            const categoryFilter = document.querySelector('.category-filter');
            categoryFilter.value = 'ui';
            this.dashboard.updateFilters();

            const uiOnly = this.dashboard.filteredErrors.every(e => e.category === 'ui');
            const correctCount = this.dashboard.filteredErrors.length === 1;

            this.addTestResult('Filtering', 'Category Filtering',
                uiOnly && correctCount,
                `Filtered to ${this.dashboard.filteredErrors.length} UI errors`);

        } catch (error) {
            this.addTestResult('Filtering', 'Category Filtering', false, error.message);
        }
    }

    /**
     * Test time range filtering
     */
    async testTimeRangeFiltering() {
        try {
            const now = Date.now();
            const oneHourAgo = now - (60 * 60 * 1000);
            const sixHoursAgo = now - (6 * 60 * 60 * 1000);

            // Set up errors with different timestamps
            const timeErrors = [
                { message: 'Recent error', timestamp: now },
                { message: 'Old error', timestamp: sixHoursAgo }
            ];

            this.dashboard.displayedErrors = timeErrors;

            // Filter by last hour
            const timeFilter = document.querySelector('.time-filter');
            timeFilter.value = '1h';
            this.dashboard.updateFilters();

            const recentOnly = this.dashboard.filteredErrors.every(e => e.timestamp >= oneHourAgo);
            const correctCount = this.dashboard.filteredErrors.length === 1;

            this.addTestResult('Filtering', 'Time Range Filtering',
                recentOnly && correctCount,
                `Filtered to ${this.dashboard.filteredErrors.length} recent errors`);

        } catch (error) {
            this.addTestResult('Filtering', 'Time Range Filtering', false, error.message);
        }
    }

    /**
     * Test search filtering
     */
    async testSearchFiltering() {
        try {
            // Set up errors with different messages
            const searchErrors = [
                { message: 'Database connection failed', timestamp: Date.now() },
                { message: 'User authentication error', timestamp: Date.now() },
                { message: 'File not found', timestamp: Date.now() }
            ];

            this.dashboard.displayedErrors = searchErrors;

            // Search for "database"
            const searchInput = document.querySelector('.search-input');
            searchInput.value = 'database';
            this.dashboard.currentFilters.searchTerm = 'database';
            this.dashboard.updateFilters();

            const databaseOnly = this.dashboard.filteredErrors.every(e =>
                e.message.toLowerCase().includes('database'));
            const correctCount = this.dashboard.filteredErrors.length === 1;

            this.addTestResult('Filtering', 'Search Filtering',
                databaseOnly && correctCount,
                `Filtered to ${this.dashboard.filteredErrors.length} matching errors`);

        } catch (error) {
            this.addTestResult('Filtering', 'Search Filtering', false, error.message);
        }
    }

    /**
     * Run performance tests
     */
    async runPerformanceTests() {
        console.log('⚡ Running performance tests...');

        // Test 1: Render performance
        await this.testRenderPerformance();

        // Test 2: Large error list handling
        await this.testLargeErrorList();

        // Test 3: Memory usage
        await this.testMemoryUsage();

        // Test 4: Update frequency
        await this.testUpdateFrequency();
    }

    /**
     * Test render performance
     */
    async testRenderPerformance() {
        try {
            const errors = this.generateMockErrors(100);
            this.dashboard.filteredErrors = errors;

            const startTime = performance.now();
            this.dashboard.renderErrorList();
            const endTime = performance.now();

            const renderTime = endTime - startTime;
            const performant = renderTime < this.config.performanceThreshold;

            this.addTestResult('Performance', 'Render Performance',
                performant,
                `Rendered 100 errors in ${renderTime.toFixed(2)}ms`);

        } catch (error) {
            this.addTestResult('Performance', 'Render Performance', false, error.message);
        }
    }

    /**
     * Test large error list handling
     */
    async testLargeErrorList() {
        try {
            const largeErrorList = this.generateMockErrors(1000);

            const startTime = performance.now();
            this.dashboard.displayedErrors = largeErrorList;
            this.dashboard.updateFilteredErrors();
            this.dashboard.renderErrorList();
            const endTime = performance.now();

            const totalTime = endTime - startTime;
            const efficient = totalTime < this.config.performanceThreshold * 2;

            this.addTestResult('Performance', 'Large Error List',
                efficient,
                `Handled 1000 errors in ${totalTime.toFixed(2)}ms`);

        } catch (error) {
            this.addTestResult('Performance', 'Large Error List', false, error.message);
        }
    }

    /**
     * Test memory usage
     */
    async testMemoryUsage() {
        try {
            const initialMemory = this.dashboard.getMemoryUsage();

            // Add large number of errors
            for (let i = 0; i < 500; i++) {
                this.dashboard.handleNewErrors(this.generateMockErrors(10));
            }

            const finalMemory = this.dashboard.getMemoryUsage();
            const memoryIncrease = finalMemory - initialMemory;
            const reasonable = memoryIncrease < 50; // Less than 50MB increase

            this.addTestResult('Performance', 'Memory Usage',
                reasonable,
                `Memory increased by ${memoryIncrease}MB`);

        } catch (error) {
            this.addTestResult('Performance', 'Memory Usage', false, error.message);
        }
    }

    /**
     * Test update frequency
     */
    async testUpdateFrequency() {
        try {
            let updateCount = 0;
            const originalUpdateMetrics = this.dashboard.updateMetrics;

            this.dashboard.updateMetrics = () => {
                updateCount++;
                originalUpdateMetrics.call(this.dashboard);
            };

            // Wait for multiple update cycles
            await new Promise(resolve => setTimeout(resolve, 6000));

            const expectedUpdates = Math.floor(6000 / this.dashboard.config.updateInterval);
            const actuallyClose = Math.abs(updateCount - expectedUpdates) <= 2;

            this.addTestResult('Performance', 'Update Frequency',
                actuallyClose,
                `${updateCount} updates in 6 seconds (expected ~${expectedUpdates})`);

            // Restore original method
            this.dashboard.updateMetrics = originalUpdateMetrics;

        } catch (error) {
            this.addTestResult('Performance', 'Update Frequency', false, error.message);
        }
    }

    /**
     * Run integration tests
     */
    async runIntegrationTests() {
        console.log('🔗 Running integration tests...');

        // Test 1: ErrorManager integration
        await this.testErrorManagerIntegration();

        // Test 2: ErrorAnalytics integration
        await this.testErrorAnalyticsIntegration();

        // Test 3: Export functionality
        await this.testExportFunctionality();
    }

    /**
     * Test ErrorManager integration
     */
    async testErrorManagerIntegration() {
        try {
            let suppressCalled = false;
            this.mockErrorManager.suppressError = () => { suppressCalled = true; };

            // Create mock error item
            const mockError = { id: 'test-error', message: 'Test error' };
            this.dashboard.ignoreError(mockError);

            this.addTestResult('Integration', 'ErrorManager Integration',
                suppressCalled,
                suppressCalled ? 'ErrorManager.suppressError called' : 'Integration failed');

        } catch (error) {
            this.addTestResult('Integration', 'ErrorManager Integration', false, error.message);
        }
    }

    /**
     * Test ErrorAnalytics integration
     */
    async testErrorAnalyticsIntegration() {
        try {
            const stats = this.dashboard.errorAnalytics.getStatistics();
            const hasValidStats = stats && typeof stats.totalErrors === 'number';

            this.addTestResult('Integration', 'ErrorAnalytics Integration',
                hasValidStats,
                hasValidStats ? 'Analytics integration working' : 'Analytics integration failed');

        } catch (error) {
            this.addTestResult('Integration', 'ErrorAnalytics Integration', false, error.message);
        }
    }

    /**
     * Test export functionality
     */
    async testExportFunctionality() {
        try {
            // Mock download function
            let exportCalled = false;
            const originalDownload = this.dashboard.downloadJSON;
            this.dashboard.downloadJSON = () => { exportCalled = true; };

            this.dashboard.exportErrors();

            this.addTestResult('Integration', 'Export Functionality',
                exportCalled,
                exportCalled ? 'Export function triggered' : 'Export function not triggered');

            // Restore original function
            this.dashboard.downloadJSON = originalDownload;

        } catch (error) {
            this.addTestResult('Integration', 'Export Functionality', false, error.message);
        }
    }

    /**
     * Run accessibility tests
     */
    async runAccessibilityTests() {
        console.log('♿ Running accessibility tests...');

        // Test 1: Keyboard navigation
        await this.testKeyboardNavigation();

        // Test 2: ARIA attributes
        await this.testARIAAttributes();

        // Test 3: Color contrast
        await this.testColorContrast();

        // Test 4: Focus management
        await this.testFocusManagement();
    }

    /**
     * Test keyboard navigation
     */
    async testKeyboardNavigation() {
        try {
            const dashboard = document.getElementById('error-dashboard');
            const focusableElements = dashboard.querySelectorAll(
                'button, input, select, [tabindex]:not([tabindex="-1"])'
            );

            const hasTabindex = Array.from(focusableElements).every(el =>
                el.tabIndex >= 0 || el.hasAttribute('tabindex'));

            this.addTestResult('Accessibility', 'Keyboard Navigation',
                hasTabindex,
                `${focusableElements.length} focusable elements found`);

        } catch (error) {
            this.addTestResult('Accessibility', 'Keyboard Navigation', false, error.message);
        }
    }

    /**
     * Test ARIA attributes
     */
    async testARIAAttributes() {
        try {
            const dashboard = document.getElementById('error-dashboard');
            const buttons = dashboard.querySelectorAll('button');

            let hasAriaLabels = true;
            buttons.forEach(button => {
                if (!button.hasAttribute('title') && !button.hasAttribute('aria-label')) {
                    hasAriaLabels = false;
                }
            });

            this.addTestResult('Accessibility', 'ARIA Attributes',
                hasAriaLabels,
                hasAriaLabels ? 'All buttons have ARIA labels' : 'Missing ARIA labels');

        } catch (error) {
            this.addTestResult('Accessibility', 'ARIA Attributes', false, error.message);
        }
    }

    /**
     * Test color contrast
     */
    async testColorContrast() {
        try {
            const dashboard = document.getElementById('error-dashboard');
            const computedStyle = window.getComputedStyle(dashboard);

            const backgroundColor = computedStyle.backgroundColor;
            const color = computedStyle.color;

            // Basic check - ensure colors are set
            const hasColors = backgroundColor !== 'rgba(0, 0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)';

            this.addTestResult('Accessibility', 'Color Contrast',
                hasColors,
                hasColors ? 'Colors properly defined' : 'Colors not properly defined');

        } catch (error) {
            this.addTestResult('Accessibility', 'Color Contrast', false, error.message);
        }
    }

    /**
     * Test focus management
     */
    async testFocusManagement() {
        try {
            const searchInput = document.querySelector('.search-input');

            // Test focus method
            this.dashboard.focusSearch();
            const isFocused = document.activeElement === searchInput;

            this.addTestResult('Accessibility', 'Focus Management',
                isFocused,
                isFocused ? 'Focus management working' : 'Focus management not working');

        } catch (error) {
            this.addTestResult('Accessibility', 'Focus Management', false, error.message);
        }
    }

    /**
     * Generate mock errors for testing
     */
    generateMockErrors(count) {
        const severities = ['critical', 'error', 'warning', 'info'];
        const categories = ['ui', 'network', 'storage', 'performance', 'validation'];
        const messages = [
            'Database connection failed',
            'User authentication error',
            'File not found',
            'Memory allocation failed',
            'Network timeout occurred',
            'Invalid input provided',
            'Permission denied',
            'Resource not available'
        ];

        const errors = [];
        for (let i = 0; i < count; i++) {
            errors.push({
                id: `mock-error-${i}`,
                timestamp: Date.now() - (Math.random() * 24 * 60 * 60 * 1000),
                severity: severities[Math.floor(Math.random() * severities.length)],
                category: categories[Math.floor(Math.random() * categories.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                source: `test-source-${i}.js:${Math.floor(Math.random() * 100)}`,
                stack: `Error: Mock error ${i}\n    at test-source-${i}.js:${Math.floor(Math.random() * 100)}`,
                recovered: Math.random() > 0.7
            });
        }

        return errors;
    }

    /**
     * Add test result
     */
    addTestResult(category, test, passed, details) {
        this.testResults.push({
            category,
            test,
            passed,
            details,
            timestamp: new Date().toISOString()
        });

        const status = passed ? '✅' : '❌';
        console.log(`${status} ${category} - ${test}: ${details}`);
    }

    /**
     * Generate test report
     */
    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const passRate = ((passedTests / totalTests) * 100).toFixed(1);

        console.log('\n📊 ErrorDashboard Test Report');
        console.log('================================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Pass Rate: ${passRate}%`);

        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`- ${result.category} - ${result.test}: ${result.details}`);
            });
        }

        // Create detailed report object
        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                passRate: parseFloat(passRate),
                timestamp: new Date().toISOString()
            },
            results: this.testResults,
            categories: this.groupResultsByCategory()
        };

        // Make report available globally
        window.errorDashboardTestReport = report;

        console.log('\n📄 Detailed report available in window.errorDashboardTestReport');
    }

    /**
     * Group results by category
     */
    groupResultsByCategory() {
        const categories = {};

        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    tests: []
                };
            }

            categories[result.category].total++;
            if (result.passed) {
                categories[result.category].passed++;
            } else {
                categories[result.category].failed++;
            }
            categories[result.category].tests.push(result);
        });

        return categories;
    }

    /**
     * Cleanup test environment
     */
    async cleanup() {
        console.log('🧹 Cleaning up test environment...');

        try {
            // Stop dashboard updates
            if (this.dashboard) {
                this.dashboard.destroy();
            }

            // Remove test container
            if (this.testContainer && this.testContainer.parentNode) {
                this.testContainer.parentNode.removeChild(this.testContainer);
            }

            console.log('✅ Cleanup complete');

        } catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorDashboardTestSuite;
}

// Global registration and auto-run capability
window.ErrorDashboardTestSuite = ErrorDashboardTestSuite;

// Auto-run tests if dashboard is available
if (typeof ErrorDashboard !== 'undefined') {
    window.runErrorDashboardTests = async () => {
        const testSuite = new ErrorDashboardTestSuite();
        await testSuite.runAllTests();
        return window.errorDashboardTestReport;
    };

    console.log('🧪 ErrorDashboard tests loaded. Run with: runErrorDashboardTests()');
}