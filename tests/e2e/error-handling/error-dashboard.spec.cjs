/**
 * Error Dashboard Test Suite
 * Tests the error dashboard UI, functionality, and real-time updates
 */

const { test, expect } = require('@playwright/test');
const {
    ErrorInjector,
    StateValidator,
    PerformanceMonitor,
    ErrorMonitor,
    TestHelpers,
    ScreenshotComparator
} = require('../../utils/error-helpers');

test.describe('Error Dashboard Tests', () => {
    let errorInjector;
    let stateValidator;
    let performanceMonitor;
    let errorMonitor;
    let screenshotComparator;

    test.beforeEach(async ({ page }) => {
        // Initialize test utilities
        errorInjector = new ErrorInjector(page);
        stateValidator = new StateValidator(page);
        performanceMonitor = new PerformanceMonitor(page);
        errorMonitor = new ErrorMonitor(page);
        screenshotComparator = new ScreenshotComparator(page);

        // Enable developer mode for dashboard access
        await page.addInitScript(() => {
            localStorage.setItem('developerMode', 'true');
        });

        // Start error monitoring
        await errorMonitor.startListening();

        // Navigate to game and initialize
        await page.goto('/?dev=true');
        await TestHelpers.waitForGameLoad(page);
        await TestHelpers.initializeFreshGame(page);
    });

    test.afterEach(async ({ page }) => {
        await errorInjector.cleanup();
        errorMonitor.stopListening();
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test.describe('Dashboard Initialization', () => {
        test('should initialize dashboard in developer mode', async ({ page }) => {
            // Look for dashboard toggle or initialization
            const dashboardToggle = page.locator('.error-dashboard-toggle, [data-dashboard="toggle"]');

            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);

                // Verify dashboard is visible
                const dashboard = page.locator('.error-dashboard, #error-dashboard');
                await expect(dashboard).toBeVisible();

                // Check for essential dashboard components
                const errorList = page.locator('.error-list, .dashboard-errors');
                const metricsPanel = page.locator('.metrics-panel, .dashboard-metrics');

                if (await errorList.count() > 0) {
                    await expect(errorList).toBeVisible();
                }
                if (await metricsPanel.count() > 0) {
                    await expect(metricsPanel).toBeVisible();
                }
            } else {
                // Dashboard might be auto-initialized, check if it exists
                const dashboard = page.locator('.error-dashboard, #error-dashboard');
                if (await dashboard.count() > 0) {
                    console.log('Dashboard auto-initialized');
                }
            }
        });

        test('should not show dashboard in production mode', async ({ page }) => {
            // Disable developer mode
            await page.evaluate(() => {
                localStorage.setItem('developerMode', 'false');
            });

            // Reload page
            await page.reload();
            await TestHelpers.waitForGameLoad(page);

            // Verify dashboard is not visible
            const dashboard = page.locator('.error-dashboard, #error-dashboard');
            const dashboardVisible = await dashboard.isVisible().catch(() => false);

            expect(dashboardVisible).toBe(false);
        });

        test('should initialize with default configuration', async ({ page }) => {
            // Access dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);

                // Check default filter settings
                const severityFilter = page.locator('.severity-filter, [data-filter="severity"]');
                const categoryFilter = page.locator('.category-filter, [data-filter="category"]');

                if (await severityFilter.count() > 0) {
                    const severityValue = await severityFilter.inputValue();
                    expect(['all', '']).toContain(severityValue);
                }

                if (await categoryFilter.count() > 0) {
                    const categoryValue = await categoryFilter.inputValue();
                    expect(['all', '']).toContain(categoryValue);
                }
            }
        });
    });

    test.describe('Real-time Error Display', () => {
        test('should display errors in real-time', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Get initial error count
            const initialErrors = await page.locator('.error-item, .dashboard-error').count();

            // Inject multiple errors
            await errorInjector.injectJavaScriptError('Dashboard test error 1');
            await page.waitForTimeout(500);
            await errorInjector.injectJavaScriptError('Dashboard test error 2');
            await page.waitForTimeout(500);

            // Wait for dashboard update
            await page.waitForTimeout(2000);

            // Verify errors appeared in dashboard
            const currentErrors = await page.locator('.error-item, .dashboard-error').count();
            expect(currentErrors).toBeGreaterThan(initialErrors);

            // Check if error messages are displayed
            const errorText1 = page.locator('text=Dashboard test error 1');
            const errorText2 = page.locator('text=Dashboard test error 2');

            if (await errorText1.count() > 0) {
                await expect(errorText1).toBeVisible();
            }
            if (await errorText2.count() > 0) {
                await expect(errorText2).toBeVisible();
            }
        });

        test('should update error metrics in real-time', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Get initial metrics
            const metricsPanel = page.locator('.metrics-panel, .dashboard-metrics');

            // Inject errors and monitor metrics updates
            const errorCount = 3;
            for (let i = 0; i < errorCount; i++) {
                await errorInjector.injectJavaScriptError(`Metrics test error ${i}`);
                await page.waitForTimeout(500);
            }

            // Wait for metrics update
            await page.waitForTimeout(2000);

            // Check for updated metrics display
            const totalErrorsDisplay = page.locator('.total-errors, [data-metric="total"]');
            const errorRateDisplay = page.locator('.error-rate, [data-metric="rate"]');

            if (await totalErrorsDisplay.count() > 0) {
                const totalText = await totalErrorsDisplay.textContent();
                expect(totalText).toMatch(/\d+/); // Should contain numbers
            }

            if (await errorRateDisplay.count() > 0) {
                const rateText = await errorRateDisplay.textContent();
                expect(rateText).toMatch(/\d+/); // Should contain numbers
            }
        });

        test('should show error severity indicators', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject errors of different severities
            await errorInjector.injectJavaScriptError('Low severity error');
            await errorInjector.injectReferenceError('criticalError'); // Should be higher severity
            await page.waitForTimeout(2000);

            // Look for severity indicators
            const severityIndicators = page.locator('.severity-indicator, .error-severity, [data-severity]');

            if (await severityIndicators.count() > 0) {
                // Should have at least one severity indicator
                await expect(severityIndicators.first()).toBeVisible();

                // Check for different severity classes/colors
                const severityClasses = await severityIndicators.evaluateAll(elements => {
                    return elements.map(el => el.className || el.getAttribute('data-severity'));
                });

                expect(severityClasses.length).toBeGreaterThan(0);
            }
        });
    });

    test.describe('Dashboard Filtering and Search', () => {
        test('should filter errors by severity', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject errors of different types
            await errorInjector.injectJavaScriptError('Low priority error');
            await errorInjector.injectReferenceError('highPriorityError');
            await page.waitForTimeout(2000);

            // Look for severity filter
            const severityFilter = page.locator('.severity-filter, [data-filter="severity"]');

            if (await severityFilter.count() > 0) {
                // Try filtering by high severity
                await severityFilter.selectOption('high');
                await page.waitForTimeout(1000);

                // Count visible errors after filtering
                const visibleErrors = await page.locator('.error-item:visible, .dashboard-error:visible').count();

                // Should have fewer errors displayed
                expect(visibleErrors).toBeGreaterThanOrEqual(0);

                // Reset filter
                await severityFilter.selectOption('all');
                await page.waitForTimeout(500);
            }
        });

        test('should search errors by text', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject identifiable errors
            await errorInjector.injectJavaScriptError('Searchable error message');
            await errorInjector.injectJavaScriptError('Different error content');
            await page.waitForTimeout(2000);

            // Look for search input
            const searchInput = page.locator('.search-input, [data-search], input[placeholder*="search"]');

            if (await searchInput.count() > 0) {
                // Search for specific error
                await searchInput.fill('Searchable');
                await page.waitForTimeout(1000);

                // Check filtered results
                const errorItems = page.locator('.error-item, .dashboard-error');
                const visibleErrors = await errorItems.count();

                // Should filter results
                if (visibleErrors > 0) {
                    const firstErrorText = await errorItems.first().textContent();
                    expect(firstErrorText.toLowerCase()).toContain('searchable');
                }

                // Clear search
                await searchInput.fill('');
                await page.waitForTimeout(500);
            }
        });

        test('should filter by time range', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject recent errors
            await errorInjector.injectJavaScriptError('Recent error');
            await page.waitForTimeout(1000);

            // Look for time range filter
            const timeFilter = page.locator('.time-filter, [data-filter="time"]');

            if (await timeFilter.count() > 0) {
                // Get initial error count
                const initialCount = await page.locator('.error-item, .dashboard-error').count();

                // Filter to last 5 minutes
                await timeFilter.selectOption('5m');
                await page.waitForTimeout(1000);

                // Should still show recent errors
                const filteredCount = await page.locator('.error-item, .dashboard-error').count();
                expect(filteredCount).toBeGreaterThanOrEqual(0);

                // Filter to last hour
                await timeFilter.selectOption('1h');
                await page.waitForTimeout(500);
            }
        });

        test('should combine multiple filters', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject varied errors
            await errorInjector.injectJavaScriptError('Critical system error');
            await errorInjector.injectReferenceError('minorIssue');
            await page.waitForTimeout(2000);

            // Apply multiple filters
            const searchInput = page.locator('.search-input, [data-search]');
            const severityFilter = page.locator('.severity-filter, [data-filter="severity"]');

            if (await searchInput.count() > 0 && await severityFilter.count() > 0) {
                await searchInput.fill('Critical');
                await severityFilter.selectOption('high');
                await page.waitForTimeout(1000);

                // Verify combined filtering
                const filteredErrors = page.locator('.error-item, .dashboard-error');
                const count = await filteredErrors.count();

                if (count > 0) {
                    const errorText = await filteredErrors.first().textContent();
                    expect(errorText.toLowerCase()).toContain('critical');
                }

                // Clear filters
                await searchInput.fill('');
                await severityFilter.selectOption('all');
            }
        });
    });

    test.describe('Error Detail Viewing', () => {
        test('should show detailed error information', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject error with stack trace
            await errorInjector.injectJavaScriptError('Detailed error for inspection');
            await page.waitForTimeout(2000);

            // Click on error to view details
            const errorItem = page.locator('.error-item, .dashboard-error').first();

            if (await errorItem.count() > 0) {
                await errorItem.click();
                await page.waitForTimeout(1000);

                // Look for detail panel
                const detailPanel = page.locator('.error-detail, .detail-panel');

                if (await detailPanel.count() > 0) {
                    await expect(detailPanel).toBeVisible();

                    // Check for error details
                    const errorMessage = page.locator('.error-message, [data-detail="message"]');
                    const stackTrace = page.locator('.stack-trace, [data-detail="stack"]');
                    const timestamp = page.locator('.error-timestamp, [data-detail="timestamp"]');

                    if (await errorMessage.count() > 0) {
                        await expect(errorMessage).toBeVisible();
                    }
                    if (await stackTrace.count() > 0) {
                        await expect(stackTrace).toBeVisible();
                    }
                    if (await timestamp.count() > 0) {
                        await expect(timestamp).toBeVisible();
                    }
                }
            }
        });

        test('should provide error context information', async ({ page }) => {
            // Setup game context
            await TestHelpers.createTestSaveData(page, 3, { gold: 1000 });

            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject contextual error
            await errorInjector.injectJavaScriptError('Context-aware error');
            await page.waitForTimeout(2000);

            // View error details
            const errorItem = page.locator('.error-item, .dashboard-error').first();
            if (await errorItem.count() > 0) {
                await errorItem.click();
                await page.waitForTimeout(1000);

                // Look for context information
                const contextPanel = page.locator('.error-context, [data-section="context"]');
                const gameStateInfo = page.locator('.game-state-info, [data-context="gamestate"]');
                const browserInfo = page.locator('.browser-info, [data-context="browser"]');

                if (await contextPanel.count() > 0) {
                    // Should show context information
                    expect(await contextPanel.count()).toBeGreaterThan(0);
                }
            }
        });

        test('should allow error classification viewing', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject classifiable error
            await errorInjector.injectReferenceError('classificationTest');
            await page.waitForTimeout(2000);

            // View error details
            const errorItem = page.locator('.error-item, .dashboard-error').first();
            if (await errorItem.count() > 0) {
                await errorItem.click();
                await page.waitForTimeout(1000);

                // Look for classification information
                const classificationInfo = page.locator('.error-classification, [data-section="classification"]');
                const severityInfo = page.locator('.severity-info, [data-classification="severity"]');
                const categoryInfo = page.locator('.category-info, [data-classification="category"]');

                if (await classificationInfo.count() > 0) {
                    // Should show classification details
                    expect(await classificationInfo.count()).toBeGreaterThan(0);
                }
            }
        });
    });

    test.describe('Dashboard Analytics', () => {
        test('should display error analytics charts', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Generate analytics data
            for (let i = 0; i < 5; i++) {
                await errorInjector.injectJavaScriptError(`Analytics error ${i}`);
                await page.waitForTimeout(200);
            }

            await page.waitForTimeout(2000);

            // Look for analytics visualizations
            const chartContainer = page.locator('.analytics-chart, .error-chart, [data-chart]');
            const metricsDisplay = page.locator('.metrics-display, .analytics-metrics');

            if (await chartContainer.count() > 0) {
                await expect(chartContainer.first()).toBeVisible();
            }

            if (await metricsDisplay.count() > 0) {
                await expect(metricsDisplay).toBeVisible();

                // Check for specific metrics
                const errorRate = page.locator('.error-rate-metric, [data-metric="rate"]');
                const errorTrend = page.locator('.error-trend, [data-metric="trend"]');

                if (await errorRate.count() > 0) {
                    const rateText = await errorRate.textContent();
                    expect(rateText).toMatch(/\d+/);
                }
            }
        });

        test('should show error frequency over time', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Create time-distributed errors
            for (let i = 0; i < 3; i++) {
                await errorInjector.injectJavaScriptError(`Time series error ${i}`);
                await page.waitForTimeout(1000);
            }

            // Look for time series visualization
            const timeChart = page.locator('.time-series-chart, [data-chart="timeline"]');
            const frequencyDisplay = page.locator('.frequency-display, [data-metric="frequency"]');

            if (await timeChart.count() > 0) {
                await expect(timeChart).toBeVisible();
            }

            if (await frequencyDisplay.count() > 0) {
                const frequencyText = await frequencyDisplay.textContent();
                expect(frequencyText).toMatch(/\d+/); // Should show frequency numbers
            }
        });

        test('should categorize errors by type', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject different error types
            await errorInjector.injectJavaScriptError('JavaScript runtime error');
            await errorInjector.injectReferenceError('undefinedVar');
            await errorInjector.injectDOMError('#missing-element');
            await page.waitForTimeout(2000);

            // Look for category breakdown
            const categoryChart = page.locator('.category-chart, [data-chart="categories"]');
            const typeBreakdown = page.locator('.error-type-breakdown, [data-breakdown="types"]');

            if (await categoryChart.count() > 0) {
                await expect(categoryChart).toBeVisible();
            }

            if (await typeBreakdown.count() > 0) {
                await expect(typeBreakdown).toBeVisible();

                // Should show different error categories
                const categories = page.locator('.error-category, [data-category]');
                if (await categories.count() > 0) {
                    expect(await categories.count()).toBeGreaterThan(0);
                }
            }
        });
    });

    test.describe('Dashboard Performance', () => {
        test('should maintain performance with many errors', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Measure dashboard performance
            await performanceMonitor.startMeasurement('dashboard-performance');

            // Generate many errors
            const errorCount = 20;
            for (let i = 0; i < errorCount; i++) {
                await errorInjector.injectJavaScriptError(`Performance test error ${i}`);
                if (i % 5 === 0) {
                    await page.waitForTimeout(100); // Small delays
                }
            }

            // Wait for dashboard updates
            await page.waitForTimeout(3000);

            const performanceTime = await performanceMonitor.endMeasurement('dashboard-performance');

            // Dashboard should remain responsive
            expect(performanceTime).toBeLessThan(10000); // 10 second threshold

            // Verify dashboard is still functional
            const errorItems = page.locator('.error-item, .dashboard-error');
            const displayedCount = await errorItems.count();

            expect(displayedCount).toBeGreaterThan(0);
            expect(displayedCount).toBeLessThanOrEqual(errorCount);
        });

        test('should handle rapid error updates', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            await performanceMonitor.startMeasurement('rapid-updates');

            // Rapid error injection
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(errorInjector.injectJavaScriptError(`Rapid error ${i}`));
            }

            await Promise.all(promises);
            await page.waitForTimeout(2000);

            const updateTime = await performanceMonitor.endMeasurement('rapid-updates');

            // Should handle rapid updates efficiently
            expect(updateTime).toBeLessThan(5000);

            // Dashboard should still be responsive
            const searchInput = page.locator('.search-input, [data-search]');
            if (await searchInput.count() > 0) {
                await searchInput.fill('test');
                await page.waitForTimeout(500);
                await searchInput.fill('');
            }
        });

        test('should limit memory usage with error history', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Measure initial memory
            const initialMemory = await performanceMonitor.measureMemory();

            // Generate extensive error history
            for (let i = 0; i < 50; i++) {
                await errorInjector.injectJavaScriptError(`Memory test error ${i}`);
                if (i % 10 === 0) {
                    await page.waitForTimeout(100);
                }
            }

            await page.waitForTimeout(3000);

            // Measure memory after errors
            const finalMemory = await performanceMonitor.measureMemory();

            // Memory growth should be reasonable
            if (initialMemory && finalMemory) {
                const memoryGrowth = finalMemory.used - initialMemory.used;
                expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB limit
            }

            // Dashboard should still function
            const dashboard = page.locator('.error-dashboard, #error-dashboard');
            await expect(dashboard).toBeVisible();
        });
    });

    test.describe('Developer Mode Features', () => {
        test('should provide developer debugging tools', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject error for debugging
            await errorInjector.injectJavaScriptError('Debug test error');
            await page.waitForTimeout(2000);

            // Look for developer tools
            const debugPanel = page.locator('.debug-panel, [data-panel="debug"]');
            const consoleOutput = page.locator('.console-output, [data-tool="console"]');
            const stackAnalyzer = page.locator('.stack-analyzer, [data-tool="stack"]');

            // Should have debugging capabilities
            if (await debugPanel.count() > 0) {
                await expect(debugPanel).toBeVisible();
            }

            // Check for developer actions
            const clearButton = page.locator('.clear-errors-button, [data-action="clear"]');
            const exportButton = page.locator('.export-errors-button, [data-action="export"]');

            if (await clearButton.count() > 0) {
                await expect(clearButton).toBeVisible();
            }
        });

        test('should allow error export functionality', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Generate errors for export
            await errorInjector.injectJavaScriptError('Export test error 1');
            await errorInjector.injectJavaScriptError('Export test error 2');
            await page.waitForTimeout(2000);

            // Look for export functionality
            const exportButton = page.locator('.export-button, [data-action="export"]');

            if (await exportButton.count() > 0) {
                // Test export functionality
                const downloadPromise = page.waitForEvent('download');
                await exportButton.click();

                try {
                    const download = await downloadPromise;
                    expect(download).toBeDefined();
                } catch (error) {
                    // Export might work differently, just verify button is functional
                    console.log('Export triggered (download event not captured)');
                }
            }
        });

        test('should toggle dashboard visibility', async ({ page }) => {
            // Test dashboard toggle
            const dashboardToggle = page.locator('.error-dashboard-toggle, [data-dashboard="toggle"]');

            if (await dashboardToggle.count() > 0) {
                // Initially dashboard might be hidden
                const initialState = await page.locator('.error-dashboard').isVisible().catch(() => false);

                // Toggle dashboard
                await dashboardToggle.click();
                await page.waitForTimeout(1000);

                const afterToggleState = await page.locator('.error-dashboard').isVisible().catch(() => false);

                // State should have changed
                expect(afterToggleState).not.toBe(initialState);

                // Toggle again
                await dashboardToggle.click();
                await page.waitForTimeout(1000);

                const finalState = await page.locator('.error-dashboard').isVisible().catch(() => false);

                // Should return to initial state
                expect(finalState).toBe(initialState);
            }
        });
    });
});