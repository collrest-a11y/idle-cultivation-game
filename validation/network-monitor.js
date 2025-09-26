/**
 * Network Monitor
 *
 * Monitors network requests, failures, and performance for the idle cultivation game.
 * Tracks API calls, resource loading, and network-related issues that could affect gameplay.
 */
export class NetworkMonitor {
  constructor(options = {}) {
    this.options = {
      timeoutThreshold: 10000,     // Request timeout threshold (10s)
      slowRequestThreshold: 3000,  // Slow request threshold (3s)
      retryLimit: 3,               // Max retry attempts to track
      criticalEndpoints: [         // Critical game endpoints
        '/api/save',
        '/api/load',
        '/api/character',
        '/api/progress'
      ],
      ...options
    };

    this.errors = [];
    this.listeners = new Set();
    this.isActive = false;

    // Network tracking
    this.requestHistory = [];
    this.failurePatterns = new Map();
    this.networkStats = {
      totalRequests: 0,
      failedRequests: 0,
      slowRequests: 0,
      timeouts: 0,
      retries: 0
    };

    // Request tracking maps
    this.pendingRequests = new Map();
    this.requestMetrics = new Map();
  }

  /**
   * Initialize network monitoring on a page
   */
  async initialize(page) {
    this.page = page;
    this.isActive = true;

    // Set up request/response monitoring
    await this.setupRequestMonitoring();

    // Set up network failure detection
    await this.setupFailureDetection();

    // Set up response monitoring
    await this.setupResponseMonitoring();

    // Start periodic network health checks
    this.startNetworkHealthMonitoring();
  }

  /**
   * Set up request monitoring
   */
  async setupRequestMonitoring() {
    // Monitor all outgoing requests
    this.page.on('request', (request) => {
      const requestData = {
        id: this.generateRequestId(),
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers(),
        startTime: Date.now(),
        isCritical: this.isCriticalEndpoint(request.url()),
        retryCount: this.getRetryCount(request.url()),
        postData: request.postData()
      };

      this.pendingRequests.set(request.url(), requestData);
      this.trackRequest(requestData);

      // Check for high retry count
      if (requestData.retryCount > this.options.retryLimit) {
        this.captureError({
          type: 'excessive-retries',
          severity: requestData.isCritical ? 'CRITICAL' : 'HIGH',
          url: request.url(),
          retryCount: requestData.retryCount,
          message: `Excessive retries detected: ${requestData.retryCount} attempts for ${request.url()}`,
          timestamp: Date.now(),
          context: { method: request.method(), isCritical: requestData.isCritical }
        });
      }
    });
  }

  /**
   * Set up failure detection
   */
  async setupFailureDetection() {
    // Monitor failed requests
    this.page.on('requestfailed', (request) => {
      const pendingData = this.pendingRequests.get(request.url());
      const failureData = {
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        isCritical: this.isCriticalEndpoint(request.url()),
        duration: pendingData ? Date.now() - pendingData.startTime : 0,
        retryCount: this.getRetryCount(request.url()),
        timestamp: Date.now()
      };

      this.trackFailure(failureData);

      // Clean up pending request
      this.pendingRequests.delete(request.url());

      // Determine severity based on failure type and criticality
      const severity = this.determineFailureSeverity(failureData);

      this.captureError({
        type: 'network-request-failed',
        severity,
        url: failureData.url,
        method: failureData.method,
        failure: failureData.failure,
        duration: failureData.duration,
        isCritical: failureData.isCritical,
        message: `Network request failed: ${failureData.method} ${failureData.url} - ${failureData.failure?.errorText || 'Unknown error'}`,
        timestamp: failureData.timestamp,
        context: failureData
      });

      // Track failure patterns
      this.updateFailurePatterns(failureData);
    });
  }

  /**
   * Set up response monitoring
   */
  async setupResponseMonitoring() {
    // Monitor all responses
    this.page.on('response', async (response) => {
      const request = response.request();
      const pendingData = this.pendingRequests.get(request.url());
      const endTime = Date.now();
      const duration = pendingData ? endTime - pendingData.startTime : 0;

      const responseData = {
        url: response.url(),
        method: request.method(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        duration,
        isCritical: this.isCriticalEndpoint(response.url()),
        size: 0, // Will be calculated if possible
        timestamp: endTime
      };

      // Try to get response size
      try {
        const body = await response.text();
        responseData.size = new Blob([body]).size;
      } catch (e) {
        // Cannot access response body, skip size calculation
      }

      // Clean up pending request
      this.pendingRequests.delete(request.url());

      // Track successful response
      this.trackResponse(responseData);

      // Check for HTTP errors
      if (response.status() >= 400) {
        const severity = this.determineHttpErrorSeverity(responseData);

        this.captureError({
          type: 'http-error',
          severity,
          url: responseData.url,
          method: responseData.method,
          status: responseData.status,
          statusText: responseData.statusText,
          duration: responseData.duration,
          isCritical: responseData.isCritical,
          message: `HTTP error: ${responseData.status} ${responseData.statusText} for ${responseData.method} ${responseData.url}`,
          timestamp: responseData.timestamp,
          context: responseData
        });
      }

      // Check for slow requests
      if (duration > this.options.slowRequestThreshold) {
        this.captureError({
          type: 'slow-network-request',
          severity: responseData.isCritical ? 'HIGH' : 'MEDIUM',
          url: responseData.url,
          method: responseData.method,
          duration: responseData.duration,
          threshold: this.options.slowRequestThreshold,
          isCritical: responseData.isCritical,
          message: `Slow network request: ${responseData.method} ${responseData.url} took ${duration}ms`,
          timestamp: responseData.timestamp,
          context: responseData
        });
      }

      // Check for timeouts (requests that took too long)
      if (duration > this.options.timeoutThreshold) {
        this.captureError({
          type: 'request-timeout',
          severity: responseData.isCritical ? 'CRITICAL' : 'HIGH',
          url: responseData.url,
          method: responseData.method,
          duration: responseData.duration,
          threshold: this.options.timeoutThreshold,
          isCritical: responseData.isCritical,
          message: `Request timeout: ${responseData.method} ${responseData.url} took ${duration}ms (threshold: ${this.options.timeoutThreshold}ms)`,
          timestamp: responseData.timestamp,
          context: responseData
        });
      }
    });
  }

  /**
   * Start network health monitoring
   */
  startNetworkHealthMonitoring() {
    // Check network health every 30 seconds
    setInterval(() => {
      if (!this.isActive) return;

      this.checkNetworkHealth();
      this.detectNetworkPatterns();
      this.cleanupOldData();
    }, 30000);
  }

  /**
   * Track a request
   */
  trackRequest(requestData) {
    this.networkStats.totalRequests++;
    this.requestHistory.push({
      ...requestData,
      type: 'request'
    });

    // Keep only recent history
    if (this.requestHistory.length > 1000) {
      this.requestHistory.shift();
    }
  }

  /**
   * Track a failure
   */
  trackFailure(failureData) {
    this.networkStats.failedRequests++;

    if (failureData.failure?.errorText?.includes('timeout') ||
        failureData.failure?.errorText?.includes('TIMEOUT')) {
      this.networkStats.timeouts++;
    }

    if (failureData.retryCount > 0) {
      this.networkStats.retries++;
    }

    this.requestHistory.push({
      ...failureData,
      type: 'failure'
    });
  }

  /**
   * Track a response
   */
  trackResponse(responseData) {
    if (responseData.duration > this.options.slowRequestThreshold) {
      this.networkStats.slowRequests++;
    }

    this.requestHistory.push({
      ...responseData,
      type: 'response'
    });
  }

  /**
   * Check overall network health
   */
  checkNetworkHealth() {
    const recentRequests = this.getRecentRequests(60000); // Last minute
    if (recentRequests.length === 0) return;

    const failures = recentRequests.filter(r => r.type === 'failure');
    const responses = recentRequests.filter(r => r.type === 'response' && r.status >= 400);
    const totalErrors = failures.length + responses.length;

    // High error rate
    const errorRate = totalErrors / recentRequests.length;
    if (errorRate > 0.2) { // More than 20% error rate
      this.captureError({
        type: 'high-network-error-rate',
        severity: errorRate > 0.5 ? 'CRITICAL' : 'HIGH',
        errorRate: `${(errorRate * 100).toFixed(1)}%`,
        totalRequests: recentRequests.length,
        totalErrors,
        message: `High network error rate: ${(errorRate * 100).toFixed(1)}% of requests failing`,
        timestamp: Date.now(),
        context: {
          failures: failures.length,
          httpErrors: responses.length,
          recentRequests: recentRequests.slice(-5) // Sample of recent requests
        }
      });
    }

    // Check for complete network failure
    const recentSuccesses = recentRequests.filter(r =>
      r.type === 'response' && r.status >= 200 && r.status < 400
    );

    if (recentRequests.length > 10 && recentSuccesses.length === 0) {
      this.captureError({
        type: 'complete-network-failure',
        severity: 'CRITICAL',
        totalRequests: recentRequests.length,
        message: 'Complete network failure: No successful requests in the last minute',
        timestamp: Date.now(),
        context: {
          recentFailures: failures.slice(-10),
          recentErrors: responses.slice(-10)
        }
      });
    }
  }

  /**
   * Detect network failure patterns
   */
  detectNetworkPatterns() {
    // Analyze failure patterns for specific endpoints or error types
    for (const [pattern, occurrences] of this.failurePatterns.entries()) {
      if (occurrences.length >= 5) { // 5+ failures in the same pattern
        const recentOccurrences = occurrences.filter(
          timestamp => Date.now() - timestamp < 300000 // Last 5 minutes
        );

        if (recentOccurrences.length >= 3) {
          this.captureError({
            type: 'network-failure-pattern',
            severity: 'HIGH',
            pattern,
            occurrences: recentOccurrences.length,
            totalOccurrences: occurrences.length,
            message: `Network failure pattern detected: ${pattern} (${recentOccurrences.length} recent occurrences)`,
            timestamp: Date.now(),
            context: { pattern, recentOccurrences: recentOccurrences.slice(-5) }
          });

          // Clean up old occurrences to prevent memory leaks
          this.failurePatterns.set(pattern, recentOccurrences);
        }
      }
    }
  }

  /**
   * Update failure patterns tracking
   */
  updateFailurePatterns(failureData) {
    const pattern = `${failureData.method}:${this.extractDomain(failureData.url)}:${failureData.failure?.errorText || 'unknown'}`;

    if (!this.failurePatterns.has(pattern)) {
      this.failurePatterns.set(pattern, []);
    }

    this.failurePatterns.get(pattern).push(failureData.timestamp);
  }

  /**
   * Check if endpoint is critical for game functionality
   */
  isCriticalEndpoint(url) {
    return this.options.criticalEndpoints.some(endpoint =>
      url.includes(endpoint)
    );
  }

  /**
   * Get retry count for a URL (simplified implementation)
   */
  getRetryCount(url) {
    const recent = this.getRecentRequests(60000);
    return recent.filter(r => r.url === url).length - 1;
  }

  /**
   * Determine failure severity
   */
  determineFailureSeverity(failureData) {
    if (failureData.isCritical) return 'CRITICAL';

    const errorText = failureData.failure?.errorText?.toLowerCase() || '';

    // Network infrastructure failures
    if (errorText.includes('net::err_internet_disconnected') ||
        errorText.includes('net::err_network_changed') ||
        errorText.includes('net::err_connection_failed')) {
      return 'CRITICAL';
    }

    // Timeout errors
    if (errorText.includes('timeout') || errorText.includes('timed_out')) {
      return failureData.isCritical ? 'CRITICAL' : 'HIGH';
    }

    // Server errors
    if (errorText.includes('net::err_connection_refused') ||
        errorText.includes('net::err_connection_reset')) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  /**
   * Determine HTTP error severity
   */
  determineHttpErrorSeverity(responseData) {
    if (responseData.isCritical) {
      return responseData.status >= 500 ? 'CRITICAL' : 'HIGH';
    }

    if (responseData.status >= 500) return 'HIGH';
    if (responseData.status >= 400) return 'MEDIUM';

    return 'LOW';
  }

  /**
   * Get recent requests within a time window
   */
  getRecentRequests(timeWindow = 60000) {
    const cutoff = Date.now() - timeWindow;
    return this.requestHistory.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return 'unknown-domain';
    }
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  cleanupOldData() {
    const cutoff = Date.now() - 300000; // Keep 5 minutes of history

    // Clean request history
    this.requestHistory = this.requestHistory.filter(r => r.timestamp >= cutoff);

    // Clean failure patterns
    for (const [pattern, occurrences] of this.failurePatterns.entries()) {
      const recentOccurrences = occurrences.filter(timestamp => timestamp >= cutoff);
      if (recentOccurrences.length === 0) {
        this.failurePatterns.delete(pattern);
      } else {
        this.failurePatterns.set(pattern, recentOccurrences);
      }
    }

    // Clean pending requests (shouldn't be many, but just in case)
    for (const [url, requestData] of this.pendingRequests.entries()) {
      if (requestData.startTime < cutoff) {
        this.pendingRequests.delete(url);
      }
    }
  }

  /**
   * Get network connectivity status
   */
  async getNetworkStatus() {
    if (!this.page) return { status: 'unknown' };

    try {
      const isOnline = await this.page.evaluate(() => navigator.onLine);
      const connectionType = await this.page.evaluate(() => {
        if ('connection' in navigator) {
          return {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          };
        }
        return null;
      });

      return {
        status: isOnline ? 'online' : 'offline',
        connection: connectionType
      };
    } catch (e) {
      return { status: 'unknown', error: e.message };
    }
  }

  /**
   * Capture a network error
   */
  captureError(error) {
    // Add context
    error.context = {
      ...error.context,
      url: this.page?.url() || 'unknown',
      networkStats: { ...this.networkStats },
      timestamp: error.timestamp || Date.now(),
      monitorActive: this.isActive
    };

    this.errors.push(error);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in network monitor listener:', e);
      }
    });

    // Log for debugging
    console.log(`[NET-${error.severity}] ${error.type}: ${error.message || error.type}`);
  }

  /**
   * Subscribe to network errors
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get all captured errors
   */
  getErrors(severity = null) {
    if (severity) {
      return this.errors.filter(error => error.severity === severity);
    }
    return this.errors;
  }

  /**
   * Get network monitoring summary
   */
  getSummary() {
    const errorsBySeverity = {
      CRITICAL: this.getErrors('CRITICAL').length,
      HIGH: this.getErrors('HIGH').length,
      MEDIUM: this.getErrors('MEDIUM').length,
      LOW: this.getErrors('LOW').length
    };

    const recentRequests = this.getRecentRequests(60000);
    const errorRate = this.networkStats.totalRequests > 0 ?
      (this.networkStats.failedRequests / this.networkStats.totalRequests) * 100 : 0;

    return {
      totalErrors: this.errors.length,
      errorsBySeverity,
      networkStats: {
        ...this.networkStats,
        errorRate: `${errorRate.toFixed(1)}%`,
        recentRequests: recentRequests.length,
        activePatterns: this.failurePatterns.size,
        pendingRequests: this.pendingRequests.size
      },
      isActive: this.isActive,
      historySize: this.requestHistory.length
    };
  }

  /**
   * Clear all errors and reset stats
   */
  clear() {
    this.errors = [];
    this.requestHistory = [];
    this.failurePatterns.clear();
    this.pendingRequests.clear();
    this.requestMetrics.clear();

    this.networkStats = {
      totalRequests: 0,
      failedRequests: 0,
      slowRequests: 0,
      timeouts: 0,
      retries: 0
    };
  }

  /**
   * Stop monitoring and clean up
   */
  destroy() {
    this.isActive = false;
    this.listeners.clear();
    this.clear();
  }
}