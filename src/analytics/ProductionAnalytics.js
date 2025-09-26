/**
 * Production Analytics Dashboard
 *
 * Real-time production metrics visualization, error trend analysis, forecasting,
 * performance impact correlation, user experience measurement, and business
 * intelligence integration for the error handling system.
 *
 * @version 1.0.0
 * @since 2025-09-26
 */

class ProductionAnalytics {
    constructor() {
        this.config = window.ProductionConfig || null;
        this.monitor = window.ProductionMonitor || null;
        this.security = window.ErrorSecurity || null;

        // Analytics state
        this.analytics = {
            metricsBuffer: [],
            trends: new Map(),
            forecasts: new Map(),
            correlations: new Map(),
            insights: [],
            dashboardData: {},
            lastUpdate: 0
        };

        // Time series data
        this.timeSeries = {
            errorRates: [],
            responseTime: [],
            memoryUsage: [],
            cpuUsage: [],
            userActivity: [],
            systemLoad: []
        };

        // Analysis configuration
        this.analysisConfig = {
            trendWindow: 24 * 60 * 60 * 1000, // 24 hours
            forecastHorizon: 4 * 60 * 60 * 1000, // 4 hours
            correlationThreshold: 0.7,
            anomalyThreshold: 2.0, // Standard deviations
            updateInterval: 60000, // 1 minute
            retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

        // Business metrics
        this.businessMetrics = {
            userSatisfaction: 0,
            systemReliability: 0,
            performanceIndex: 0,
            errorImpact: 0,
            operationalEfficiency: 0
        };

        // Initialize analytics subsystems
        this.initializeDataCollection();
        this.initializeTrendAnalysis();
        this.initializeForecastingEngine();
        this.initializeCorrelationAnalysis();
        this.initializeAnomalyDetection();
        this.initializeBusinessIntelligence();
        this.initializeDashboard();

        // Start analytics processing
        this.startAnalytics();

        console.log('[ProductionAnalytics] Analytics system initialized');
    }

    /**
     * Initialize data collection from various sources
     */
    initializeDataCollection() {
        this.dataCollectors = {
            errorManager: this.collectErrorManagerData.bind(this),
            productionMonitor: this.collectMonitoringData.bind(this),
            userActivity: this.collectUserActivityData.bind(this),
            performance: this.collectPerformanceData.bind(this),
            business: this.collectBusinessData.bind(this)
        };

        // Setup data collection interval
        setInterval(() => {
            this.collectAllData();
        }, this.analysisConfig.updateInterval);
    }

    /**
     * Initialize trend analysis engine
     */
    initializeTrendAnalysis() {
        this.trendAnalyzer = {
            algorithms: {
                movingAverage: this.calculateMovingAverage.bind(this),
                exponentialSmoothing: this.calculateExponentialSmoothing.bind(this),
                linearRegression: this.calculateLinearRegression.bind(this),
                seasonalDecomposition: this.calculateSeasonalDecomposition.bind(this)
            },
            patterns: new Map(),
            seasonality: new Map()
        };
    }

    /**
     * Initialize forecasting engine
     */
    initializeForecastingEngine() {
        this.forecastEngine = {
            models: {
                arima: this.arimaForecast.bind(this),
                exponentialSmoothing: this.exponentialSmoothingForecast.bind(this),
                linear: this.linearForecast.bind(this),
                seasonal: this.seasonalForecast.bind(this)
            },
            accuracy: new Map(),
            confidence: new Map()
        };
    }

    /**
     * Initialize correlation analysis
     */
    initializeCorrelationAnalysis() {
        this.correlationAnalyzer = {
            metrics: [
                'errorRate',
                'responseTime',
                'memoryUsage',
                'cpuUsage',
                'userActivity',
                'systemLoad'
            ],
            correlationMatrix: new Map(),
            causalRelationships: new Map()
        };
    }

    /**
     * Initialize anomaly detection
     */
    initializeAnomalyDetection() {
        this.anomalyDetector = {
            methods: {
                statisticalOutliers: this.detectStatisticalOutliers.bind(this),
                changePoints: this.detectChangePoints.bind(this),
                seasonalAnomalies: this.detectSeasonalAnomalies.bind(this),
                correlationAnomalies: this.detectCorrelationAnomalies.bind(this)
            },
            anomalies: [],
            thresholds: new Map()
        };
    }

    /**
     * Initialize business intelligence
     */
    initializeBusinessIntelligence() {
        this.businessIntelligence = {
            kpis: {
                systemUptime: this.calculateSystemUptime.bind(this),
                errorRate: this.calculateErrorRate.bind(this),
                userSatisfaction: this.calculateUserSatisfaction.bind(this),
                operationalCost: this.calculateOperationalCost.bind(this),
                performanceIndex: this.calculatePerformanceIndex.bind(this)
            },
            insights: [],
            recommendations: []
        };
    }

    /**
     * Initialize dashboard
     */
    initializeDashboard() {
        this.dashboard = {
            widgets: new Map(),
            layout: 'grid',
            themes: ['light', 'dark'],
            currentTheme: 'dark',
            refreshRate: 30000, // 30 seconds
            autoRefresh: true
        };

        // Setup dashboard auto-refresh
        setInterval(() => {
            if (this.dashboard.autoRefresh) {
                this.updateDashboard();
            }
        }, this.dashboard.refreshRate);
    }

    /**
     * Start analytics processing
     */
    startAnalytics() {
        // Main analytics loop
        setInterval(() => {
            this.processAnalytics();
        }, this.analysisConfig.updateInterval);

        // Trend analysis loop
        setInterval(() => {
            this.updateTrendAnalysis();
        }, 5 * 60 * 1000); // 5 minutes

        // Forecasting loop
        setInterval(() => {
            this.updateForecasts();
        }, 15 * 60 * 1000); // 15 minutes

        // Correlation analysis loop
        setInterval(() => {
            this.updateCorrelationAnalysis();
        }, 10 * 60 * 1000); // 10 minutes

        // Anomaly detection loop
        setInterval(() => {
            this.detectAnomalies();
        }, 2 * 60 * 1000); // 2 minutes

        // Business intelligence loop
        setInterval(() => {
            this.updateBusinessIntelligence();
        }, 60 * 60 * 1000); // 1 hour

        console.log('[ProductionAnalytics] Analytics processing started');
    }

    /**
     * Collect data from all sources
     */
    collectAllData() {
        const timestamp = Date.now();
        const data = {
            timestamp,
            sources: {}
        };

        // Collect from each data source
        Object.entries(this.dataCollectors).forEach(([source, collector]) => {
            try {
                data.sources[source] = collector();
            } catch (error) {
                console.warn(`[ProductionAnalytics] Data collection failed for ${source}:`, error);
                data.sources[source] = { error: error.message };
            }
        });

        // Add to metrics buffer
        this.analytics.metricsBuffer.push(data);

        // Trim buffer to prevent memory issues
        if (this.analytics.metricsBuffer.length > 1000) {
            this.analytics.metricsBuffer.splice(0, this.analytics.metricsBuffer.length - 1000);
        }

        // Update time series data
        this.updateTimeSeries(data);

        return data;
    }

    /**
     * Collect error manager data
     */
    collectErrorManagerData() {
        if (!window.ErrorManager) return { available: false };

        return {
            available: true,
            totalErrors: window.ErrorManager.getTotalErrors?.() || 0,
            errorRate: window.ErrorManager.getErrorRate?.() || 0,
            errorsByType: window.ErrorManager.getErrorsByType?.() || {},
            recentErrors: window.ErrorManager.getRecentErrors?.(10) || [],
            recoveryActions: window.ErrorManager.getRecoveryStats?.() || {},
            systemHealth: window.ErrorManager.isHealthy?.() || false
        };
    }

    /**
     * Collect monitoring data
     */
    collectMonitoringData() {
        if (!this.monitor) return { available: false };

        return {
            available: true,
            dashboardData: this.monitor.getDashboardData?.() || {},
            healthStatus: this.monitor.healthStatus || 'unknown',
            systemState: this.monitor.state || {},
            activeAlerts: this.monitor.alerts?.size || 0,
            activeIncidents: this.monitor.incidents?.size || 0
        };
    }

    /**
     * Collect user activity data
     */
    collectUserActivityData() {
        return {
            available: true,
            activeUsers: this.estimateActiveUsers(),
            sessionDuration: this.getAverageSessionDuration(),
            userActions: this.getUserActionCount(),
            bounceRate: this.calculateBounceRate(),
            pageViews: this.getPageViewCount()
        };
    }

    /**
     * Collect performance data
     */
    collectPerformanceData() {
        const performance = {
            available: true,
            responseTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            networkLatency: 0,
            renderTime: 0
        };

        // Collect browser performance data
        if (typeof window.performance !== 'undefined') {
            const navTiming = performance.getEntriesByType?.('navigation')?.[0];
            if (navTiming) {
                performance.responseTime = navTiming.responseEnd - navTiming.responseStart;
                performance.renderTime = navTiming.loadEventEnd - navTiming.loadEventStart;
                performance.networkLatency = navTiming.responseStart - navTiming.requestStart;
            }

            // Memory usage
            if (window.performance.memory) {
                performance.memoryUsage = window.performance.memory.usedJSHeapSize;
            }
        }

        return performance;
    }

    /**
     * Collect business data
     */
    collectBusinessData() {
        return {
            available: true,
            revenue: this.estimateRevenue(),
            userRetention: this.calculateUserRetention(),
            conversionRate: this.calculateConversionRate(),
            customerSatisfaction: this.estimateCustomerSatisfaction(),
            operationalCosts: this.estimateOperationalCosts()
        };
    }

    /**
     * Update time series data
     */
    updateTimeSeries(data) {
        const timestamp = data.timestamp;

        // Extract metrics for time series
        const metrics = {
            errorRate: data.sources.errorManager?.errorRate || 0,
            responseTime: data.sources.performance?.responseTime || 0,
            memoryUsage: data.sources.performance?.memoryUsage || 0,
            cpuUsage: data.sources.monitoring?.systemState?.cpuUsage || 0,
            userActivity: data.sources.userActivity?.activeUsers || 0,
            systemLoad: data.sources.monitoring?.systemState?.systemLoad || 0
        };

        // Add to time series
        Object.entries(metrics).forEach(([metric, value]) => {
            if (!this.timeSeries[metric]) {
                this.timeSeries[metric] = [];
            }

            this.timeSeries[metric].push({
                timestamp,
                value
            });

            // Trim old data
            const cutoff = timestamp - this.analysisConfig.retentionPeriod;
            this.timeSeries[metric] = this.timeSeries[metric].filter(
                point => point.timestamp > cutoff
            );
        });
    }

    /**
     * Process analytics
     */
    processAnalytics() {
        const timestamp = Date.now();

        try {
            // Update business metrics
            this.updateBusinessMetrics();

            // Generate insights
            this.generateInsights();

            // Update dashboard data
            this.analytics.dashboardData = this.generateDashboardData();
            this.analytics.lastUpdate = timestamp;

        } catch (error) {
            console.error('[ProductionAnalytics] Analytics processing failed:', error);
        }
    }

    /**
     * Update trend analysis
     */
    updateTrendAnalysis() {
        Object.entries(this.timeSeries).forEach(([metric, data]) => {
            if (data.length < 2) return;

            const values = data.map(point => point.value);
            const timestamps = data.map(point => point.timestamp);

            // Calculate trends using different algorithms
            const trends = {
                movingAverage: this.trendAnalyzer.algorithms.movingAverage(values, 5),
                exponentialSmoothing: this.trendAnalyzer.algorithms.exponentialSmoothing(values, 0.3),
                linearRegression: this.trendAnalyzer.algorithms.linearRegression(timestamps, values),
                seasonality: this.trendAnalyzer.algorithms.seasonalDecomposition(values)
            };

            this.analytics.trends.set(metric, trends);
        });
    }

    /**
     * Update forecasts
     */
    updateForecasts() {
        Object.entries(this.timeSeries).forEach(([metric, data]) => {
            if (data.length < 10) return; // Need minimum data for forecasting

            const values = data.map(point => point.value);
            const forecastSteps = Math.ceil(this.analysisConfig.forecastHorizon / this.analysisConfig.updateInterval);

            // Generate forecasts using different models
            const forecasts = {
                linear: this.forecastEngine.models.linear(values, forecastSteps),
                exponentialSmoothing: this.forecastEngine.models.exponentialSmoothing(values, forecastSteps),
                seasonal: this.forecastEngine.models.seasonal(values, forecastSteps)
            };

            this.analytics.forecasts.set(metric, forecasts);
        });
    }

    /**
     * Update correlation analysis
     */
    updateCorrelationAnalysis() {
        const metrics = this.correlationAnalyzer.metrics;
        const correlationMatrix = new Map();

        // Calculate correlations between all metric pairs
        for (let i = 0; i < metrics.length; i++) {
            for (let j = i + 1; j < metrics.length; j++) {
                const metric1 = metrics[i];
                const metric2 = metrics[j];

                const data1 = this.timeSeries[metric1]?.map(point => point.value) || [];
                const data2 = this.timeSeries[metric2]?.map(point => point.value) || [];

                if (data1.length > 5 && data2.length > 5) {
                    const correlation = this.calculateCorrelation(data1, data2);
                    correlationMatrix.set(`${metric1}-${metric2}`, correlation);

                    // Check for strong correlations
                    if (Math.abs(correlation) > this.analysisConfig.correlationThreshold) {
                        this.analytics.correlations.set(`${metric1}-${metric2}`, {
                            correlation,
                            strength: Math.abs(correlation) > 0.8 ? 'strong' : 'moderate',
                            direction: correlation > 0 ? 'positive' : 'negative'
                        });
                    }
                }
            }
        }

        this.correlationAnalyzer.correlationMatrix = correlationMatrix;
    }

    /**
     * Detect anomalies
     */
    detectAnomalies() {
        const anomalies = [];

        Object.entries(this.timeSeries).forEach(([metric, data]) => {
            if (data.length < 10) return;

            const values = data.map(point => point.value);
            const recent = values.slice(-10); // Last 10 values

            // Statistical outlier detection
            const statAnomalies = this.anomalyDetector.methods.statisticalOutliers(values);
            if (statAnomalies.length > 0) {
                anomalies.push(...statAnomalies.map(anomaly => ({
                    ...anomaly,
                    metric,
                    type: 'statistical_outlier'
                })));
            }

            // Change point detection
            const changePoints = this.anomalyDetector.methods.changePoints(values);
            if (changePoints.length > 0) {
                anomalies.push(...changePoints.map(point => ({
                    timestamp: data[point].timestamp,
                    value: data[point].value,
                    metric,
                    type: 'change_point',
                    index: point
                })));
            }
        });

        this.anomalyDetector.anomalies = anomalies;

        // Alert on critical anomalies
        const criticalAnomalies = anomalies.filter(anomaly =>
            anomaly.severity === 'critical' || anomaly.type === 'change_point'
        );

        if (criticalAnomalies.length > 0 && this.monitor) {
            criticalAnomalies.forEach(anomaly => {
                this.monitor.triggerAlert?.(
                    `anomaly-${anomaly.metric}`,
                    `Anomaly detected in ${anomaly.metric}: ${anomaly.type}`,
                    'warning'
                );
            });
        }
    }

    /**
     * Update business intelligence
     */
    updateBusinessIntelligence() {
        // Calculate KPIs
        Object.entries(this.businessIntelligence.kpis).forEach(([kpi, calculator]) => {
            try {
                this.businessMetrics[kpi] = calculator();
            } catch (error) {
                console.warn(`[ProductionAnalytics] KPI calculation failed for ${kpi}:`, error);
                this.businessMetrics[kpi] = 0;
            }
        });

        // Generate insights and recommendations
        this.generateBusinessInsights();
        this.generateRecommendations();
    }

    /**
     * Generate dashboard data
     */
    generateDashboardData() {
        return {
            timestamp: Date.now(),
            overview: {
                systemHealth: this.monitor?.healthStatus || 'unknown',
                errorRate: this.getLatestValue('errorRate'),
                responseTime: this.getLatestValue('responseTime'),
                activeUsers: this.getLatestValue('userActivity'),
                uptime: this.businessMetrics.systemUptime || 0
            },
            metrics: {
                timeSeries: this.getTimeSeriesForDashboard(),
                trends: Object.fromEntries(this.analytics.trends),
                forecasts: Object.fromEntries(this.analytics.forecasts),
                correlations: Object.fromEntries(this.analytics.correlations)
            },
            business: this.businessMetrics,
            alerts: this.monitor?.alerts ? Array.from(this.monitor.alerts.values()) : [],
            anomalies: this.anomalyDetector.anomalies.slice(-10), // Last 10 anomalies
            insights: this.analytics.insights.slice(-5), // Last 5 insights
            recommendations: this.businessIntelligence.recommendations.slice(-3) // Last 3 recommendations
        };
    }

    /**
     * Get analytics dashboard for external consumption
     */
    getAnalyticsDashboard() {
        return {
            ...this.analytics.dashboardData,
            configuration: {
                updateInterval: this.analysisConfig.updateInterval,
                retentionPeriod: this.analysisConfig.retentionPeriod,
                autoRefresh: this.dashboard.autoRefresh,
                theme: this.dashboard.currentTheme
            },
            systemInfo: {
                metricsBufferSize: this.analytics.metricsBuffer.length,
                timeSeriesSize: Object.keys(this.timeSeries).length,
                trendsTracked: this.analytics.trends.size,
                forecastsGenerated: this.analytics.forecasts.size,
                correlationsFound: this.analytics.correlations.size,
                anomaliesDetected: this.anomalyDetector.anomalies.length
            }
        };
    }

    // Utility methods for calculations
    calculateMovingAverage(values, window) {
        const result = [];
        for (let i = window - 1; i < values.length; i++) {
            const avg = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0) / window;
            result.push(avg);
        }
        return result;
    }

    calculateExponentialSmoothing(values, alpha) {
        const result = [values[0]];
        for (let i = 1; i < values.length; i++) {
            result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
        }
        return result;
    }

    calculateLinearRegression(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept, trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable' };
    }

    calculateSeasonalDecomposition(values) {
        // Simple seasonal decomposition
        if (values.length < 24) return { seasonal: [], trend: [], residual: [] };

        const period = 24; // Assume daily seasonality
        const seasonal = [];
        const trend = this.calculateMovingAverage(values, period);

        // Calculate seasonal component
        for (let i = 0; i < period; i++) {
            const seasonalValues = [];
            for (let j = i; j < values.length; j += period) {
                if (trend[j - Math.floor(period / 2)]) {
                    seasonalValues.push(values[j] - trend[j - Math.floor(period / 2)]);
                }
            }
            seasonal[i] = seasonalValues.length > 0 ?
                seasonalValues.reduce((a, b) => a + b, 0) / seasonalValues.length : 0;
        }

        return { seasonal, trend, period };
    }

    calculateCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denomX = 0;
        let denomY = 0;

        for (let i = 0; i < n; i++) {
            const deltaX = x[i] - meanX;
            const deltaY = y[i] - meanY;
            numerator += deltaX * deltaY;
            denomX += deltaX * deltaX;
            denomY += deltaY * deltaY;
        }

        const correlation = numerator / Math.sqrt(denomX * denomY);
        return isNaN(correlation) ? 0 : correlation;
    }

    detectStatisticalOutliers(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        const outliers = [];
        values.forEach((value, index) => {
            const zScore = Math.abs((value - mean) / stdDev);
            if (zScore > this.analysisConfig.anomalyThreshold) {
                outliers.push({
                    index,
                    value,
                    zScore,
                    severity: zScore > 3 ? 'critical' : 'warning'
                });
            }
        });

        return outliers;
    }

    detectChangePoints(values) {
        const changePoints = [];
        const windowSize = Math.min(10, Math.floor(values.length / 4));

        for (let i = windowSize; i < values.length - windowSize; i++) {
            const before = values.slice(i - windowSize, i);
            const after = values.slice(i, i + windowSize);

            const meanBefore = before.reduce((a, b) => a + b, 0) / before.length;
            const meanAfter = after.reduce((a, b) => a + b, 0) / after.length;

            const change = Math.abs(meanAfter - meanBefore) / Math.abs(meanBefore);

            if (change > 0.5) { // 50% change threshold
                changePoints.push(i);
            }
        }

        return changePoints;
    }

    detectSeasonalAnomalies(values) {
        // Placeholder for seasonal anomaly detection
        return [];
    }

    detectCorrelationAnomalies(values) {
        // Placeholder for correlation-based anomaly detection
        return [];
    }

    // Forecasting methods
    linearForecast(values, steps) {
        const x = values.map((_, i) => i);
        const regression = this.calculateLinearRegression(x, values);

        const forecast = [];
        for (let i = 0; i < steps; i++) {
            const futureX = values.length + i;
            const predictedY = regression.slope * futureX + regression.intercept;
            forecast.push(predictedY);
        }

        return forecast;
    }

    exponentialSmoothingForecast(values, steps) {
        const alpha = 0.3;
        const smoothed = this.calculateExponentialSmoothing(values, alpha);
        const lastValue = smoothed[smoothed.length - 1];

        // Simple forecast - repeat last smoothed value
        return new Array(steps).fill(lastValue);
    }

    arimaForecast(values, steps) {
        // Simplified ARIMA - use linear trend
        return this.linearForecast(values, steps);
    }

    seasonalForecast(values, steps) {
        // Use seasonal decomposition for forecasting
        const decomposition = this.calculateSeasonalDecomposition(values);
        if (decomposition.seasonal.length === 0) {
            return this.linearForecast(values, steps);
        }

        const forecast = [];
        const period = decomposition.period || 24;

        for (let i = 0; i < steps; i++) {
            const seasonalIndex = (values.length + i) % period;
            const trendValue = values[values.length - 1]; // Simple trend
            const seasonalValue = decomposition.seasonal[seasonalIndex] || 0;
            forecast.push(trendValue + seasonalValue);
        }

        return forecast;
    }

    // Business metrics calculations
    calculateSystemUptime() {
        if (!this.monitor?.startTime) return 0;
        return Date.now() - this.monitor.startTime;
    }

    calculateErrorRate() {
        return this.getLatestValue('errorRate') || 0;
    }

    calculateUserSatisfaction() {
        // Estimate based on error rates and performance
        const errorRate = this.getLatestValue('errorRate') || 0;
        const responseTime = this.getLatestValue('responseTime') || 0;

        // Simple formula: satisfaction decreases with errors and slow response
        let satisfaction = 100;
        satisfaction -= errorRate * 1000; // Each 0.1% error rate reduces satisfaction by 100 points
        satisfaction -= Math.min(responseTime / 100, 50); // Slow response reduces satisfaction

        return Math.max(0, Math.min(100, satisfaction));
    }

    calculateOperationalCost() {
        // Estimate operational cost based on system usage
        const memoryUsage = this.getLatestValue('memoryUsage') || 0;
        const cpuUsage = this.getLatestValue('cpuUsage') || 0;

        // Simple cost model
        const memoryCost = (memoryUsage / (1024 * 1024)) * 0.01; // $0.01 per MB
        const cpuCost = cpuUsage * 0.1; // $0.1 per CPU%

        return memoryCost + cpuCost;
    }

    calculatePerformanceIndex() {
        const responseTime = this.getLatestValue('responseTime') || 0;
        const memoryUsage = this.getLatestValue('memoryUsage') || 0;
        const cpuUsage = this.getLatestValue('cpuUsage') || 0;

        // Normalize and invert (higher is better)
        const responseScore = Math.max(0, 100 - (responseTime / 10)); // 1000ms = 0 score
        const memoryScore = Math.max(0, 100 - (memoryUsage / (1024 * 1024))); // 100MB = 0 score
        const cpuScore = Math.max(0, 100 - cpuUsage * 10); // 10% CPU = 0 score

        return (responseScore + memoryScore + cpuScore) / 3;
    }

    // Helper methods
    getLatestValue(metric) {
        const series = this.timeSeries[metric];
        return series && series.length > 0 ? series[series.length - 1].value : 0;
    }

    getTimeSeriesForDashboard() {
        const result = {};
        Object.entries(this.timeSeries).forEach(([metric, data]) => {
            // Return last 100 points for dashboard
            result[metric] = data.slice(-100);
        });
        return result;
    }

    updateBusinessMetrics() {
        // This is called from updateBusinessIntelligence
        // Business metrics are calculated there
    }

    generateInsights() {
        const insights = [];

        // Performance insights
        const avgResponseTime = this.getLatestValue('responseTime');
        if (avgResponseTime > 1000) {
            insights.push({
                type: 'performance',
                severity: 'warning',
                message: `Response time is high (${avgResponseTime.toFixed(0)}ms). Consider optimization.`,
                timestamp: Date.now()
            });
        }

        // Memory insights
        const memoryUsage = this.getLatestValue('memoryUsage');
        if (memoryUsage > 100 * 1024 * 1024) { // 100MB
            insights.push({
                type: 'memory',
                severity: 'warning',
                message: `Memory usage is high (${(memoryUsage / (1024 * 1024)).toFixed(1)}MB). Monitor for leaks.`,
                timestamp: Date.now()
            });
        }

        // Error rate insights
        const errorRate = this.getLatestValue('errorRate');
        if (errorRate > 0.01) { // 1%
            insights.push({
                type: 'errors',
                severity: 'critical',
                message: `Error rate is elevated (${(errorRate * 100).toFixed(2)}%). Investigate immediately.`,
                timestamp: Date.now()
            });
        }

        this.analytics.insights.push(...insights);

        // Keep only recent insights
        if (this.analytics.insights.length > 100) {
            this.analytics.insights.splice(0, this.analytics.insights.length - 100);
        }
    }

    generateBusinessInsights() {
        const insights = [];

        if (this.businessMetrics.userSatisfaction < 70) {
            insights.push({
                type: 'business',
                message: 'User satisfaction is below acceptable threshold',
                impact: 'high',
                recommendation: 'Focus on error reduction and performance optimization'
            });
        }

        if (this.businessMetrics.operationalCost > 10) {
            insights.push({
                type: 'cost',
                message: 'Operational costs are increasing',
                impact: 'medium',
                recommendation: 'Review resource usage and optimize memory/CPU consumption'
            });
        }

        this.businessIntelligence.insights.push(...insights);
    }

    generateRecommendations() {
        const recommendations = [];

        // Based on trends and correlations
        const errorTrend = this.analytics.trends.get('errorRate');
        if (errorTrend?.linearRegression?.trend === 'increasing') {
            recommendations.push({
                type: 'preventive',
                priority: 'high',
                action: 'Implement proactive error prevention measures',
                expected_impact: 'Reduce error rate by 30-50%'
            });
        }

        this.businessIntelligence.recommendations.push(...recommendations);
    }

    updateDashboard() {
        this.analytics.dashboardData = this.generateDashboardData();
    }

    // Estimation methods for business data (placeholder implementations)
    estimateActiveUsers() {
        return Math.floor(Math.random() * 100) + 1;
    }

    getAverageSessionDuration() {
        return Math.floor(Math.random() * 1800000) + 300000; // 5-35 minutes
    }

    getUserActionCount() {
        return Math.floor(Math.random() * 1000);
    }

    calculateBounceRate() {
        return Math.random() * 0.5; // 0-50%
    }

    getPageViewCount() {
        return Math.floor(Math.random() * 10000);
    }

    estimateRevenue() {
        return Math.random() * 10000;
    }

    calculateUserRetention() {
        return 0.7 + Math.random() * 0.3; // 70-100%
    }

    calculateConversionRate() {
        return Math.random() * 0.1; // 0-10%
    }

    estimateCustomerSatisfaction() {
        return 70 + Math.random() * 30; // 70-100
    }

    estimateOperationalCosts() {
        return Math.random() * 1000;
    }
}

// Global analytics instance
window.ProductionAnalytics = new ProductionAnalytics();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductionAnalytics;
}