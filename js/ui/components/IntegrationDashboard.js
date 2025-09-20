/**
 * IntegrationDashboard - Real-time integration health and monitoring dashboard
 * Extends existing dashboard framework with comprehensive integration status tracking
 */
class IntegrationDashboard extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);

        // Integration monitoring state
        this.integrationStatus = {
            systems: new Map(),
            testResults: new Map(),
            performanceMetrics: new Map(),
            errors: new Map(),
            eventPropagation: new Map()
        };

        // Real-time update configuration
        this.updateInterval = null;
        this.updateFrequency = options.updateFrequency || 1000; // 1 second
        this.websocketUrl = options.websocketUrl || null;
        this.websocket = null;

        // Chart/graph instances for data visualization
        this.charts = new Map();

        // System health thresholds
        this.healthThresholds = {
            excellent: 95,
            good: 80,
            fair: 60,
            poor: 0
        };

        // Performance monitoring integration
        this.performanceMonitor = options.performanceMonitor || window.performanceMonitor;
        this.integrationMonitor = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'integration-dashboard',
            title: 'Integration Dashboard & Monitoring',
            sections: [
                'health-overview',
                'test-results',
                'performance-metrics',
                'error-monitoring',
                'event-propagation'
            ],
            responsive: true,
            autoUpdate: true,
            showAdvancedMetrics: false
        };
    }

    getInitialState() {
        return {
            isInitialized: false,
            isConnected: false,
            selectedSystem: 'all',
            timeRange: '1h',
            autoRefresh: true,
            showDetails: false,
            alertsEnabled: true,
            theme: 'dark'
        };
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `${this.options.className} dashboard-container`;
        this.element.setAttribute('role', 'main');
        this.element.setAttribute('aria-label', 'Integration Dashboard');

        // Add responsive classes
        this.element.classList.add('responsive-dashboard');

        this.element.innerHTML = this.getHTMLTemplate();

        // Setup section containers
        this.setupSectionContainers();
    }

    getHTMLTemplate() {
        return `
            <div class="dashboard-header">
                <div class="header-content">
                    <h1 class="dashboard-title">
                        <i class="icon-dashboard" aria-hidden="true"></i>
                        ${this.options.title}
                    </h1>
                    <div class="dashboard-controls">
                        <div class="control-group">
                            <label for="system-selector">System:</label>
                            <select id="system-selector" class="system-selector">
                                <option value="all">All Systems</option>
                                <option value="cultivation">Cultivation</option>
                                <option value="scripture">Scripture</option>
                                <option value="combat">Combat</option>
                                <option value="sect">Sect</option>
                                <option value="quest">Quest</option>
                                <option value="skill">Skill</option>
                                <option value="gacha">Gacha</option>
                                <option value="enhancement">Enhancement</option>
                                <option value="realm">Realm</option>
                                <option value="technique">Technique</option>
                                <option value="reward">Reward</option>
                                <option value="achievement">Achievement</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label for="time-range">Time Range:</label>
                            <select id="time-range" class="time-range-selector">
                                <option value="5m">Last 5 Minutes</option>
                                <option value="15m">Last 15 Minutes</option>
                                <option value="1h" selected>Last Hour</option>
                                <option value="4h">Last 4 Hours</option>
                                <option value="24h">Last 24 Hours</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <button id="auto-refresh-toggle" class="toggle-button active" aria-pressed="true">
                                <i class="icon-refresh" aria-hidden="true"></i>
                                Auto Refresh
                            </button>
                        </div>
                        <div class="control-group">
                            <button id="export-data" class="action-button">
                                <i class="icon-download" aria-hidden="true"></i>
                                Export
                            </button>
                        </div>
                    </div>
                </div>
                <div class="connection-status">
                    <div class="status-indicator offline" id="connection-indicator">
                        <span class="status-dot"></span>
                        <span class="status-text">Connecting...</span>
                    </div>
                    <div class="last-update" id="last-update">
                        Last updated: Never
                    </div>
                </div>
            </div>

            <div class="dashboard-content">
                <!-- Health Overview Section -->
                <section class="dashboard-section health-overview" id="health-overview">
                    <div class="section-header">
                        <h2>System Health Overview</h2>
                        <div class="section-controls">
                            <button class="toggle-details" data-section="health">Details</button>
                        </div>
                    </div>
                    <div class="section-content">
                        <div class="health-grid">
                            <div class="health-summary">
                                <div class="overall-health">
                                    <div class="health-score" id="overall-health-score">
                                        <div class="score-value">--</div>
                                        <div class="score-label">Overall Health</div>
                                    </div>
                                    <div class="health-trend" id="health-trend">
                                        <i class="icon-trend-up"></i>
                                    </div>
                                </div>
                                <div class="system-counts">
                                    <div class="count-item healthy">
                                        <span class="count" id="healthy-systems">0</span>
                                        <span class="label">Healthy</span>
                                    </div>
                                    <div class="count-item warning">
                                        <span class="count" id="warning-systems">0</span>
                                        <span class="label">Warning</span>
                                    </div>
                                    <div class="count-item critical">
                                        <span class="count" id="critical-systems">0</span>
                                        <span class="label">Critical</span>
                                    </div>
                                </div>
                            </div>
                            <div class="systems-status" id="systems-status">
                                <!-- System status items will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Test Results Section -->
                <section class="dashboard-section test-results" id="test-results">
                    <div class="section-header">
                        <h2>Integration Test Results</h2>
                        <div class="section-controls">
                            <button class="refresh-tests" id="refresh-tests">Run Tests</button>
                        </div>
                    </div>
                    <div class="section-content">
                        <div class="test-summary">
                            <div class="test-stats">
                                <div class="stat-item passed">
                                    <span class="value" id="tests-passed">0</span>
                                    <span class="label">Passed</span>
                                </div>
                                <div class="stat-item failed">
                                    <span class="value" id="tests-failed">0</span>
                                    <span class="label">Failed</span>
                                </div>
                                <div class="stat-item coverage">
                                    <span class="value" id="test-coverage">0%</span>
                                    <span class="label">Coverage</span>
                                </div>
                            </div>
                        </div>
                        <div class="test-results-chart" id="test-results-chart">
                            <!-- Chart will be rendered here -->
                        </div>
                        <div class="test-details" id="test-details">
                            <!-- Test details table will be populated -->
                        </div>
                    </div>
                </section>

                <!-- Performance Metrics Section -->
                <section class="dashboard-section performance-metrics" id="performance-metrics">
                    <div class="section-header">
                        <h2>Performance Metrics</h2>
                        <div class="section-controls">
                            <div class="metric-toggles">
                                <button class="metric-toggle active" data-metric="fps">FPS</button>
                                <button class="metric-toggle active" data-metric="memory">Memory</button>
                                <button class="metric-toggle active" data-metric="latency">Latency</button>
                            </div>
                        </div>
                    </div>
                    <div class="section-content">
                        <div class="performance-overview">
                            <div class="performance-card fps-card">
                                <div class="card-header">
                                    <h3>Frame Rate</h3>
                                    <div class="target-indicator" title="Target: 60 FPS">
                                        <span class="target-line"></span>
                                    </div>
                                </div>
                                <div class="card-content">
                                    <div class="current-value">
                                        <span class="value" id="current-fps">--</span>
                                        <span class="unit">FPS</span>
                                    </div>
                                    <div class="performance-chart fps-chart" id="fps-chart"></div>
                                    <div class="performance-stats">
                                        <div class="stat">
                                            <span class="label">Avg:</span>
                                            <span class="value" id="avg-fps">--</span>
                                        </div>
                                        <div class="stat">
                                            <span class="label">Min:</span>
                                            <span class="value" id="min-fps">--</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="performance-card memory-card">
                                <div class="card-header">
                                    <h3>Memory Usage</h3>
                                    <div class="warning-indicator" title="Warning: > 100MB">
                                        <span class="warning-line"></span>
                                    </div>
                                </div>
                                <div class="card-content">
                                    <div class="current-value">
                                        <span class="value" id="current-memory">--</span>
                                        <span class="unit">MB</span>
                                    </div>
                                    <div class="performance-chart memory-chart" id="memory-chart"></div>
                                    <div class="performance-stats">
                                        <div class="stat">
                                            <span class="label">Peak:</span>
                                            <span class="value" id="peak-memory">--</span>
                                        </div>
                                        <div class="stat">
                                            <span class="label">Heap:</span>
                                            <span class="value" id="heap-memory">--</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="performance-card latency-card">
                                <div class="card-header">
                                    <h3>Operation Latency</h3>
                                    <div class="target-indicator" title="Target: < 10ms">
                                        <span class="target-line"></span>
                                    </div>
                                </div>
                                <div class="card-content">
                                    <div class="current-value">
                                        <span class="value" id="current-latency">--</span>
                                        <span class="unit">ms</span>
                                    </div>
                                    <div class="performance-chart latency-chart" id="latency-chart"></div>
                                    <div class="performance-stats">
                                        <div class="stat">
                                            <span class="label">P95:</span>
                                            <span class="value" id="p95-latency">--</span>
                                        </div>
                                        <div class="stat">
                                            <span class="label">Max:</span>
                                            <span class="value" id="max-latency">--</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Error Monitoring Section -->
                <section class="dashboard-section error-monitoring" id="error-monitoring">
                    <div class="section-header">
                        <h2>Error Monitoring</h2>
                        <div class="section-controls">
                            <button class="clear-errors" id="clear-errors">Clear All</button>
                        </div>
                    </div>
                    <div class="section-content">
                        <div class="error-summary">
                            <div class="error-stats">
                                <div class="stat-item integration-errors">
                                    <span class="value" id="integration-errors">0</span>
                                    <span class="label">Integration</span>
                                </div>
                                <div class="stat-item system-errors">
                                    <span class="value" id="system-errors">0</span>
                                    <span class="label">System</span>
                                </div>
                                <div class="stat-item validation-errors">
                                    <span class="value" id="validation-errors">0</span>
                                    <span class="label">Validation</span>
                                </div>
                            </div>
                        </div>
                        <div class="error-timeline" id="error-timeline">
                            <!-- Error timeline chart -->
                        </div>
                        <div class="error-list" id="error-list">
                            <!-- Error list will be populated -->
                        </div>
                    </div>
                </section>

                <!-- Event Propagation Section -->
                <section class="dashboard-section event-monitoring" id="event-monitoring">
                    <div class="section-header">
                        <h2>Event Propagation Monitoring</h2>
                        <div class="section-controls">
                            <button class="toggle-live-events" id="toggle-live-events">Live Events</button>
                        </div>
                    </div>
                    <div class="section-content">
                        <div class="event-flow-diagram" id="event-flow-diagram">
                            <!-- Interactive system flow diagram -->
                        </div>
                        <div class="event-stats">
                            <div class="event-metrics">
                                <div class="metric">
                                    <span class="label">Events/sec:</span>
                                    <span class="value" id="events-per-second">0</span>
                                </div>
                                <div class="metric">
                                    <span class="label">Avg Propagation:</span>
                                    <span class="value" id="avg-propagation">--ms</span>
                                </div>
                                <div class="metric">
                                    <span class="label">Failed Events:</span>
                                    <span class="value" id="failed-events">0</span>
                                </div>
                            </div>
                        </div>
                        <div class="live-events" id="live-events">
                            <!-- Live event stream -->
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    setupSectionContainers() {
        // Store references to key DOM elements
        this.elements = {
            systemSelector: this.element.querySelector('#system-selector'),
            timeRangeSelector: this.element.querySelector('#time-range'),
            autoRefreshToggle: this.element.querySelector('#auto-refresh-toggle'),
            connectionIndicator: this.element.querySelector('#connection-indicator'),
            lastUpdate: this.element.querySelector('#last-update'),
            overallHealthScore: this.element.querySelector('#overall-health-score'),
            systemsStatus: this.element.querySelector('#systems-status'),
            testResults: this.element.querySelector('#test-results-chart'),
            performanceCharts: {
                fps: this.element.querySelector('#fps-chart'),
                memory: this.element.querySelector('#memory-chart'),
                latency: this.element.querySelector('#latency-chart')
            },
            errorList: this.element.querySelector('#error-list'),
            eventFlowDiagram: this.element.querySelector('#event-flow-diagram'),
            liveEvents: this.element.querySelector('#live-events')
        };
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Dashboard controls
        this.elements.systemSelector?.addEventListener('change', (e) => {
            this.handleSystemChange(e.target.value);
        });

        this.elements.timeRangeSelector?.addEventListener('change', (e) => {
            this.handleTimeRangeChange(e.target.value);
        });

        this.elements.autoRefreshToggle?.addEventListener('click', () => {
            this.toggleAutoRefresh();
        });

        // Section controls
        this.element.addEventListener('click', (e) => {
            if (e.target.matches('.toggle-details')) {
                this.toggleSectionDetails(e.target.dataset.section);
            } else if (e.target.matches('.refresh-tests')) {
                this.refreshTestResults();
            } else if (e.target.matches('.clear-errors')) {
                this.clearErrors();
            } else if (e.target.matches('.toggle-live-events')) {
                this.toggleLiveEvents();
            } else if (e.target.matches('.metric-toggle')) {
                this.toggleMetric(e.target.dataset.metric);
            }
        });

        // Listen for integration events
        if (this.eventManager) {
            this.on('integration:statusUpdate', (data) => this.handleStatusUpdate(data));
            this.on('integration:testResult', (data) => this.handleTestResult(data));
            this.on('integration:error', (data) => this.handleError(data));
            this.on('integration:event', (data) => this.handleEventPropagation(data));
            this.on('performance:alert', (data) => this.handlePerformanceAlert(data));
        }
    }

    onMount() {
        super.onMount();
        this.initializeIntegrationMonitoring();
        this.startRealTimeUpdates();
        this.loadInitialData();
    }

    onUnmount() {
        super.onUnmount();
        this.stopRealTimeUpdates();
        this.disconnectWebSocket();
    }

    // Integration monitoring methods
    async initializeIntegrationMonitoring() {
        try {
            // Initialize integration monitor API
            if (this.performanceMonitor) {
                const { IntegrationMonitor } = await import('../core/IntegrationMonitor.js');
                this.integrationMonitor = new IntegrationMonitor({
                    performanceMonitor: this.performanceMonitor,
                    eventManager: this.eventManager
                });
                await this.integrationMonitor.initialize();
            }

            // Connect WebSocket if URL provided
            if (this.options.websocketUrl) {
                this.connectWebSocket();
            }

            this.setState({ isInitialized: true });
            this.updateConnectionStatus('connected');

        } catch (error) {
            console.error('IntegrationDashboard: Failed to initialize monitoring', error);
            this.updateConnectionStatus('error');
        }
    }

    startRealTimeUpdates() {
        if (this.state.autoRefresh) {
            this.updateInterval = setInterval(() => {
                this.updateDashboard();
            }, this.updateFrequency);
        }
    }

    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async updateDashboard() {
        try {
            const startTime = performance.now();

            // Update all dashboard sections
            await Promise.all([
                this.updateHealthOverview(),
                this.updateTestResults(),
                this.updatePerformanceMetrics(),
                this.updateErrorMonitoring(),
                this.updateEventMonitoring()
            ]);

            // Update last update timestamp
            this.updateLastUpdateTime();

            const updateTime = performance.now() - startTime;
            console.log(`IntegrationDashboard: Updated in ${updateTime.toFixed(2)}ms`);

        } catch (error) {
            console.error('IntegrationDashboard: Update failed', error);
        }
    }

    async updateHealthOverview() {
        if (!this.integrationMonitor) return;

        try {
            const healthData = await this.integrationMonitor.getSystemHealth();

            // Update overall health score
            const overallScore = this.calculateOverallHealth(healthData);
            this.updateHealthScore(overallScore);

            // Update system status grid
            this.updateSystemsGrid(healthData.systems);

            // Update health counters
            this.updateHealthCounters(healthData.systems);

        } catch (error) {
            console.error('Failed to update health overview', error);
        }
    }

    calculateOverallHealth(healthData) {
        if (!healthData.systems || healthData.systems.length === 0) {
            return 0;
        }

        const totalHealth = healthData.systems.reduce((sum, system) => sum + system.health, 0);
        return Math.round(totalHealth / healthData.systems.length);
    }

    updateHealthScore(score) {
        const scoreElement = this.elements.overallHealthScore?.querySelector('.score-value');
        if (scoreElement) {
            scoreElement.textContent = score;
            scoreElement.className = `score-value ${this.getHealthClass(score)}`;
        }
    }

    getHealthClass(score) {
        if (score >= this.healthThresholds.excellent) return 'excellent';
        if (score >= this.healthThresholds.good) return 'good';
        if (score >= this.healthThresholds.fair) return 'fair';
        return 'poor';
    }

    // Event handlers
    handleSystemChange(system) {
        this.setState({ selectedSystem: system });
        this.updateDashboard();
    }

    handleTimeRangeChange(timeRange) {
        this.setState({ timeRange });
        this.updateDashboard();
    }

    toggleAutoRefresh() {
        const newState = !this.state.autoRefresh;
        this.setState({ autoRefresh: newState });

        this.elements.autoRefreshToggle?.classList.toggle('active', newState);
        this.elements.autoRefreshToggle?.setAttribute('aria-pressed', newState.toString());

        if (newState) {
            this.startRealTimeUpdates();
        } else {
            this.stopRealTimeUpdates();
        }
    }

    updateConnectionStatus(status) {
        if (this.elements.connectionIndicator) {
            this.elements.connectionIndicator.className = `status-indicator ${status}`;

            const statusText = this.elements.connectionIndicator.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = this.getStatusText(status);
            }
        }

        this.setState({ isConnected: status === 'connected' });
    }

    getStatusText(status) {
        switch (status) {
            case 'connected': return 'Connected';
            case 'connecting': return 'Connecting...';
            case 'offline': return 'Offline';
            case 'error': return 'Connection Error';
            default: return 'Unknown';
        }
    }

    updateLastUpdateTime() {
        if (this.elements.lastUpdate) {
            const now = new Date();
            this.elements.lastUpdate.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    render() {
        // Dashboard is primarily event-driven, so render just ensures visibility
        if (this.element && this.state.isInitialized) {
            this.element.classList.toggle('initialized', true);
            this.element.classList.toggle('connected', this.state.isConnected);
        }
    }

    // WebSocket connection methods
    connectWebSocket() {
        if (!this.options.websocketUrl) {
            console.log('IntegrationDashboard: No WebSocket URL provided');
            return;
        }

        try {
            console.log('IntegrationDashboard: Connecting to WebSocket...', this.options.websocketUrl);
            this.updateConnectionStatus('connecting');

            this.websocket = new WebSocket(this.options.websocketUrl);

            this.websocket.onopen = (event) => {
                console.log('IntegrationDashboard: WebSocket connected');
                this.updateConnectionStatus('connected');

                // Send initial subscription message
                this.websocket.send(JSON.stringify({
                    type: 'subscribe',
                    channels: [
                        'integration.health',
                        'integration.tests',
                        'integration.performance',
                        'integration.errors',
                        'integration.events'
                    ]
                }));
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('IntegrationDashboard: Failed to parse WebSocket message', error);
                }
            };

            this.websocket.onclose = (event) => {
                console.log('IntegrationDashboard: WebSocket disconnected', event.code, event.reason);
                this.updateConnectionStatus('offline');
                this.websocket = null;

                // Attempt to reconnect after 5 seconds if not intentionally closed
                if (event.code !== 1000 && this.state.autoRefresh) {
                    setTimeout(() => {
                        if (!this.websocket && this.state.autoRefresh) {
                            this.connectWebSocket();
                        }
                    }, 5000);
                }
            };

            this.websocket.onerror = (error) => {
                console.error('IntegrationDashboard: WebSocket error', error);
                this.updateConnectionStatus('error');
            };

        } catch (error) {
            console.error('IntegrationDashboard: Failed to create WebSocket connection', error);
            this.updateConnectionStatus('error');
        }
    }

    disconnectWebSocket() {
        if (this.websocket) {
            console.log('IntegrationDashboard: Disconnecting WebSocket');
            this.websocket.close(1000, 'Dashboard closing');
            this.websocket = null;
            this.updateConnectionStatus('offline');
        }
    }

    handleWebSocketMessage(data) {
        try {
            switch (data.type) {
                case 'health.update':
                    this.handleStatusUpdate({ data: data.payload });
                    break;

                case 'test.result':
                    this.handleTestResult({ data: data.payload });
                    break;

                case 'performance.metrics':
                    this.handlePerformanceUpdate(data.payload);
                    break;

                case 'error.reported':
                    this.handleError({ data: data.payload });
                    break;

                case 'event.propagated':
                    this.handleEventPropagation({ data: data.payload });
                    break;

                case 'ping':
                    // Respond to keepalive ping
                    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                        this.websocket.send(JSON.stringify({ type: 'pong' }));
                    }
                    break;

                default:
                    console.log('IntegrationDashboard: Unknown WebSocket message type', data.type);
            }
        } catch (error) {
            console.error('IntegrationDashboard: Error handling WebSocket message', error);
        }
    }

    handlePerformanceUpdate(perfData) {
        // Update performance metrics in real-time from WebSocket
        if (perfData.current) {
            this.updateElement('#current-fps', Math.round(perfData.current.fps || 0));
            this.updateElement('#current-memory', Math.round(perfData.current.memoryUsage || 0));
        }

        if (perfData.integration) {
            const latency = perfData.integration.avgCrossSystemTime || 0;
            this.updateElement('#current-latency', Math.round(latency * 1000) / 1000);
        }

        // Update charts with new data
        if (perfData.charts) {
            Object.keys(perfData.charts).forEach(chartType => {
                this.updateRealtimeChart(chartType, perfData.charts[chartType]);
            });
        }
    }

    updateRealtimeChart(chartType, chartData) {
        const chartElement = this.element.querySelector(`#${chartType}-chart`);
        if (!chartElement || !chartData) return;

        // Simple real-time chart update
        const value = chartData.current;
        const threshold = chartData.threshold;
        const history = chartData.history || [];

        // Update simple bar chart
        const percentage = Math.min((value / threshold) * 100, 100);
        const status = value <= threshold ? 'good' : 'warning';

        chartElement.innerHTML = `
            <div class="simple-chart">
                <div class="chart-bar ${status}" style="width: ${percentage}%"></div>
                <div class="chart-value">${chartData.formatted || value}</div>
                <div class="chart-threshold">Target: ${threshold} ${chartData.unit || ''}</div>
                <div class="chart-history">
                    ${history.slice(-10).map((val, i) => `
                        <div class="history-point" style="height: ${(val / threshold) * 100}%"></div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    sendWebSocketMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    // Enhanced real-time updates with WebSocket fallback
    startRealTimeUpdates() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // WebSocket is available, rely on real-time updates
            console.log('IntegrationDashboard: Using WebSocket for real-time updates');
            return;
        }

        // Fallback to polling updates
        if (this.state.autoRefresh) {
            console.log('IntegrationDashboard: Using polling for updates');
            this.updateInterval = setInterval(() => {
                this.updateDashboard();
            }, this.updateFrequency);
        }
    }

    // Dashboard update methods
    async updateTestResults() {
        if (!this.integrationMonitor) return;

        try {
            const testData = await this.integrationMonitor.getTestResults();

            // Update test statistics
            this.updateElement('#tests-passed', testData.summary.passed);
            this.updateElement('#tests-failed', testData.summary.failed);
            this.updateElement('#test-coverage', `${testData.summary.coverage}%`);

            // Update test results chart
            this.updateTestResultsChart(testData.results);

            // Update test details table
            this.updateTestDetailsTable(testData.results);

        } catch (error) {
            console.error('Failed to update test results', error);
        }
    }

    async updatePerformanceMetrics() {
        if (!this.integrationMonitor) return;

        try {
            const perfData = await this.integrationMonitor.getPerformanceMetrics();

            // Update FPS metrics
            this.updateElement('#current-fps', Math.round(perfData.current.fps || 0));
            this.updateElement('#avg-fps', Math.round(perfData.averages.fps || 0));
            this.updateElement('#min-fps', Math.round(perfData.session?.minFPS || 0));

            // Update memory metrics
            this.updateElement('#current-memory', Math.round(perfData.current.memoryUsage || 0));
            this.updateElement('#peak-memory', Math.round(perfData.session?.maxMemory || 0));
            this.updateElement('#heap-memory', this.formatMemory(perfData.current.memoryUsage || 0));

            // Update latency metrics
            const avgLatency = perfData.integrationSpecific?.avgCrossSystemTime || 0;
            this.updateElement('#current-latency', Math.round(avgLatency * 1000) / 1000);

            // Update performance charts
            this.updatePerformanceCharts(perfData);

            // Check performance thresholds
            this.checkPerformanceThresholds(perfData);

        } catch (error) {
            console.error('Failed to update performance metrics', error);
        }
    }

    async updateErrorMonitoring() {
        if (!this.integrationMonitor) return;

        try {
            const errorData = await this.integrationMonitor.getErrorData();

            // Update error statistics
            let integrationErrors = 0, systemErrors = 0, validationErrors = 0;

            for (const [category, errors] of errorData.errors) {
                switch (category) {
                    case 'integration':
                    case 'propagation':
                        integrationErrors += errors.length;
                        break;
                    case 'performance':
                    case 'timeout':
                        systemErrors += errors.length;
                        break;
                    case 'validation':
                    case 'dependency':
                        validationErrors += errors.length;
                        break;
                }
            }

            this.updateElement('#integration-errors', integrationErrors);
            this.updateElement('#system-errors', systemErrors);
            this.updateElement('#validation-errors', validationErrors);

            // Update error timeline chart
            this.updateErrorTimelineChart(errorData.trends);

            // Update error list
            this.updateErrorList(errorData.errors);

        } catch (error) {
            console.error('Failed to update error monitoring', error);
        }
    }

    async updateEventMonitoring() {
        if (!this.integrationMonitor) return;

        try {
            const eventData = await this.integrationMonitor.getEventPropagationData();

            // Update event metrics
            const metrics = eventData.metrics;
            this.updateElement('#events-per-second', Math.round(metrics.eventsPerSecond || 0));
            this.updateElement('#avg-propagation', `${Math.round(metrics.avgPropagationTime || 0)}ms`);
            this.updateElement('#failed-events', metrics.failedEvents || 0);

            // Update event flow diagram
            this.updateEventFlowDiagram(eventData.propagationPaths);

            // Update live events if enabled
            if (this.state.showLiveEvents) {
                this.updateLiveEventsList(eventData.recentEvents);
            }

        } catch (error) {
            console.error('Failed to update event monitoring', error);
        }
    }

    updateSystemsGrid(systems) {
        const container = this.elements.systemsStatus;
        if (!container || !systems) return;

        container.innerHTML = '';

        systems.forEach(system => {
            const card = this.createSystemStatusCard(system);
            container.appendChild(card);
        });
    }

    createSystemStatusCard(system) {
        const card = document.createElement('div');
        card.className = `system-status-card ${system.status}`;
        card.setAttribute('data-system', system.id);

        card.innerHTML = `
            <div class="system-header">
                <h4>${system.name}</h4>
                <div class="health-badge ${system.status}">
                    ${Math.round(system.health)}%
                </div>
            </div>
            <div class="system-metrics">
                <div class="metric">
                    <span class="label">Response Time:</span>
                    <span class="value">${Math.round(system.metrics.responseTime)}ms</span>
                </div>
                <div class="metric">
                    <span class="label">Error Rate:</span>
                    <span class="value">${(system.metrics.errorRate * 100).toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="label">Availability:</span>
                    <span class="value">${system.metrics.availability}%</span>
                </div>
            </div>
            ${system.issues.length > 0 ? `
                <div class="system-issues">
                    <div class="issues-header">Issues:</div>
                    <ul class="issues-list">
                        ${system.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <div class="last-check">
                Last checked: ${new Date(system.lastCheck).toLocaleTimeString()}
            </div>
        `;

        return card;
    }

    updateHealthCounters(systems) {
        let healthy = 0, warning = 0, critical = 0;

        systems.forEach(system => {
            switch (system.status) {
                case 'excellent':
                case 'healthy':
                    healthy++;
                    break;
                case 'warning':
                    warning++;
                    break;
                case 'critical':
                    critical++;
                    break;
            }
        });

        this.updateElement('#healthy-systems', healthy);
        this.updateElement('#warning-systems', warning);
        this.updateElement('#critical-systems', critical);
    }

    async refreshTestResults() {
        if (!this.integrationMonitor) return;

        try {
            // Show loading state
            const testSection = this.element.querySelector('#test-results');
            testSection?.classList.add('loading');

            // Trigger test execution (would integrate with test framework)
            console.log('IntegrationDashboard: Triggering integration tests...');

            // Simulate test execution
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update test results
            await this.updateTestResults();

            // Remove loading state
            testSection?.classList.remove('loading');

            // Emit test refresh event
            this.emit('integration:testsRefreshed', { timestamp: Date.now() });

        } catch (error) {
            console.error('Failed to refresh test results', error);
        }
    }

    clearErrors() {
        if (!this.integrationMonitor) return;

        try {
            // Clear errors in integration monitor
            this.integrationMonitor.integrationMetrics.integrationErrors.clear();

            // Update error display
            this.updateElement('#integration-errors', 0);
            this.updateElement('#system-errors', 0);
            this.updateElement('#validation-errors', 0);

            // Clear error list
            const errorList = this.element.querySelector('#error-list');
            if (errorList) {
                errorList.innerHTML = '<div class="no-errors">No errors to display</div>';
            }

            // Emit error clear event
            this.emit('integration:errorsCleared', { timestamp: Date.now() });

        } catch (error) {
            console.error('Failed to clear errors', error);
        }
    }

    toggleLiveEvents() {
        const newState = !this.state.showLiveEvents;
        this.setState({ showLiveEvents: newState });

        const button = this.element.querySelector('#toggle-live-events');
        if (button) {
            button.classList.toggle('active', newState);
            button.textContent = newState ? 'Stop Live Events' : 'Live Events';
        }

        const liveEventsContainer = this.elements.liveEvents;
        if (liveEventsContainer) {
            liveEventsContainer.style.display = newState ? 'block' : 'none';
        }
    }

    toggleMetric(metric) {
        const button = this.element.querySelector(`[data-metric="${metric}"]`);
        if (!button) return;

        const isActive = button.classList.toggle('active');

        const chart = this.elements.performanceCharts[metric];
        if (chart) {
            chart.style.display = isActive ? 'block' : 'none';
        }
    }

    toggleSectionDetails(section) {
        const sectionElement = this.element.querySelector(`#${section}`);
        if (!sectionElement) return;

        const isExpanded = sectionElement.classList.toggle('expanded');

        // Show/hide additional details
        const details = sectionElement.querySelectorAll('.detail-content');
        details.forEach(detail => {
            detail.style.display = isExpanded ? 'block' : 'none';
        });
    }

    // Event handlers
    handleStatusUpdate(data) {
        if (data.data && data.data.systems) {
            this.updateSystemsGrid(data.data.systems);
            this.updateHealthCounters(data.data.systems);

            if (data.data.overallHealth !== undefined) {
                this.updateHealthScore(data.data.overallHealth);
            }
        }
    }

    handleTestResult(data) {
        // Update test results display with new test data
        this.updateTestResults();
    }

    handleError(data) {
        // Update error monitoring with new error
        this.updateErrorMonitoring();

        // Show error notification if severe
        if (data.data && data.data.severity === 'critical') {
            this.showErrorNotification(data.data);
        }
    }

    handleEventPropagation(data) {
        // Update event monitoring display
        this.updateEventMonitoring();

        // Add to live events if enabled
        if (this.state.showLiveEvents) {
            this.addLiveEvent(data.data);
        }
    }

    handlePerformanceAlert(data) {
        // Update performance metrics display
        this.updatePerformanceMetrics();

        // Show performance alert
        this.showPerformanceAlert(data.data);
    }

    async loadInitialData() {
        try {
            console.log('IntegrationDashboard: Loading initial data...');

            // Load all dashboard sections
            await Promise.all([
                this.updateHealthOverview(),
                this.updateTestResults(),
                this.updatePerformanceMetrics(),
                this.updateErrorMonitoring(),
                this.updateEventMonitoring()
            ]);

            console.log('IntegrationDashboard: Initial data loaded successfully');

        } catch (error) {
            console.error('IntegrationDashboard: Failed to load initial data', error);
        }
    }

    // Utility methods
    updateElement(selector, value) {
        const element = this.element.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    formatMemory(mb) {
        if (mb < 1) return `${(mb * 1024).toFixed(0)}KB`;
        if (mb < 1024) return `${mb.toFixed(1)}MB`;
        return `${(mb / 1024).toFixed(1)}GB`;
    }

    checkPerformanceThresholds(perfData) {
        const current = perfData.current;

        // Check FPS threshold (target: 60fps)
        if (current.fps < 60) {
            const fpsCard = this.element.querySelector('.fps-card');
            fpsCard?.classList.add('warning');
        }

        // Check memory threshold (warning: >100MB)
        if (current.memoryUsage > 100) {
            const memoryCard = this.element.querySelector('.memory-card');
            memoryCard?.classList.add('warning');
        }

        // Check latency threshold (target: <10ms)
        const latency = perfData.integrationSpecific?.avgCrossSystemTime || 0;
        if (latency > 10) {
            const latencyCard = this.element.querySelector('.latency-card');
            latencyCard?.classList.add('warning');
        }
    }

    // Chart update methods (simplified implementations)
    updateTestResultsChart(testResults) {
        const chart = this.elements.testResults;
        if (!chart) return;

        // Simple chart implementation
        chart.innerHTML = `
            <div class="chart-placeholder">
                <div class="chart-title">Test Results Over Time</div>
                <div class="chart-data">
                    <div class="data-point passed">Passed: ${testResults.filter(r => r.status === 'passed').length}</div>
                    <div class="data-point failed">Failed: ${testResults.filter(r => r.status === 'failed').length}</div>
                </div>
            </div>
        `;
    }

    updateTestDetailsTable(testResults) {
        const container = this.element.querySelector('#test-details');
        if (!container) return;

        container.innerHTML = `
            <table class="test-details-table">
                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Last Run</th>
                    </tr>
                </thead>
                <tbody>
                    ${testResults.map(test => `
                        <tr class="test-row ${test.status}">
                            <td>${test.name}</td>
                            <td><span class="status-badge ${test.status}">${test.status}</span></td>
                            <td>${test.duration}ms</td>
                            <td>${new Date(test.lastRun).toLocaleTimeString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    updatePerformanceCharts(perfData) {
        // Update FPS chart
        this.updateSimpleChart('fps-chart', perfData.current.fps, 60, 'FPS');

        // Update memory chart
        this.updateSimpleChart('memory-chart', perfData.current.memoryUsage, 100, 'MB');

        // Update latency chart
        const latency = perfData.integrationSpecific?.avgCrossSystemTime || 0;
        this.updateSimpleChart('latency-chart', latency, 10, 'ms');
    }

    updateSimpleChart(chartId, value, threshold, unit) {
        const chart = this.element.querySelector(`#${chartId}`);
        if (!chart) return;

        const percentage = Math.min((value / threshold) * 100, 100);
        const status = value <= threshold ? 'good' : 'warning';

        chart.innerHTML = `
            <div class="simple-chart">
                <div class="chart-bar ${status}" style="width: ${percentage}%"></div>
                <div class="chart-value">${value} ${unit}</div>
                <div class="chart-threshold">Target: ${threshold} ${unit}</div>
            </div>
        `;
    }

    updateErrorTimelineChart(trends) {
        const chart = this.element.querySelector('#error-timeline');
        if (!chart) return;

        chart.innerHTML = `
            <div class="timeline-chart">
                <div class="timeline-title">Error Timeline (Last Hour)</div>
                <div class="timeline-data">
                    ${trends.length > 0 ? trends.map(trend => `
                        <div class="timeline-point" style="left: ${trend.position}%">
                            <div class="point-marker ${trend.severity}"></div>
                            <div class="point-tooltip">${trend.count} errors at ${trend.time}</div>
                        </div>
                    `).join('') : '<div class="no-data">No error data available</div>'}
                </div>
            </div>
        `;
    }

    updateErrorList(errors) {
        const container = this.element.querySelector('#error-list');
        if (!container) return;

        if (errors.size === 0) {
            container.innerHTML = '<div class="no-errors">No errors to display</div>';
            return;
        }

        const errorItems = [];
        for (const [category, categoryErrors] of errors) {
            categoryErrors.forEach(error => {
                errorItems.push({ ...error, category });
            });
        }

        // Sort by timestamp (newest first)
        errorItems.sort((a, b) => b.timestamp - a.timestamp);

        container.innerHTML = errorItems.map(error => `
            <div class="error-item ${error.severity}">
                <div class="error-header">
                    <span class="error-category">${error.category}</span>
                    <span class="error-severity ${error.severity}">${error.severity}</span>
                    <span class="error-time">${new Date(error.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="error-message">${this.formatErrorMessage(error.data)}</div>
            </div>
        `).join('');
    }

    formatErrorMessage(errorData) {
        if (typeof errorData === 'string') return errorData;
        if (errorData.message) return errorData.message;
        return JSON.stringify(errorData);
    }

    updateEventFlowDiagram(propagationPaths) {
        const diagram = this.elements.eventFlowDiagram;
        if (!diagram) return;

        diagram.innerHTML = `
            <div class="flow-diagram">
                <div class="diagram-title">System Event Flow</div>
                <div class="flow-nodes">
                    ${Array.from(this.systems.keys()).map(systemId => `
                        <div class="flow-node" data-system="${systemId}">
                            <div class="node-label">${systemId}</div>
                            <div class="node-status"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="flow-connections">
                    <!-- Event flow arrows would be dynamically generated -->
                </div>
            </div>
        `;
    }

    updateLiveEventsList(recentEvents) {
        const container = this.elements.liveEvents;
        if (!container) return;

        const eventItems = recentEvents.slice(-20).reverse(); // Show last 20 events

        container.innerHTML = eventItems.map(event => `
            <div class="live-event-item">
                <div class="event-timestamp">${new Date(event.timestamp).toLocaleTimeString()}</div>
                <div class="event-type">${event.type}</div>
                <div class="event-source">${event.source}</div>
                <div class="event-duration">${event.duration ? Math.round(event.duration) + 'ms' : 'pending'}</div>
            </div>
        `).join('');
    }

    addLiveEvent(eventData) {
        const container = this.elements.liveEvents;
        if (!container) return;

        const eventItem = document.createElement('div');
        eventItem.className = 'live-event-item new';
        eventItem.innerHTML = `
            <div class="event-timestamp">${new Date().toLocaleTimeString()}</div>
            <div class="event-type">${eventData.type}</div>
            <div class="event-source">${eventData.source || 'unknown'}</div>
            <div class="event-duration">pending</div>
        `;

        container.insertBefore(eventItem, container.firstChild);

        // Remove 'new' class after animation
        setTimeout(() => eventItem.classList.remove('new'), 500);

        // Limit to 20 events
        const events = container.querySelectorAll('.live-event-item');
        if (events.length > 20) {
            events[events.length - 1].remove();
        }
    }

    showErrorNotification(error) {
        // Simple notification implementation
        console.warn('Critical integration error:', error);

        // Could integrate with a toast notification system
        if (this.eventManager) {
            this.eventManager.emit('ui:notification', {
                type: 'error',
                title: 'Critical Integration Error',
                message: this.formatErrorMessage(error.data),
                duration: 5000
            });
        }
    }

    showPerformanceAlert(alert) {
        console.warn('Performance alert:', alert);

        if (this.eventManager) {
            this.eventManager.emit('ui:notification', {
                type: 'warning',
                title: 'Performance Alert',
                message: `${alert.type}: ${alert.value} (threshold: ${alert.threshold})`,
                duration: 3000
            });
        }
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IntegrationDashboard };
} else if (typeof window !== 'undefined') {
    window.IntegrationDashboard = IntegrationDashboard;
}