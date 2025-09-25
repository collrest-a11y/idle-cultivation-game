/**
 * Production Monitoring Integration
 * Integrates validation metrics with various monitoring services
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

/**
 * Base monitoring class
 */
class MonitoringIntegration {
  constructor(config = {}) {
    this.config = {
      enabled: process.env.MONITORING_ENABLED === 'true',
      environment: process.env.NODE_ENV || 'production',
      service: process.env.MONITORING_SERVICE || 'console',
      ...config
    };

    this.metrics = {
      validationRuns: 0,
      errorsFound: 0,
      errorsFixed: 0,
      fixSuccessRate: 0,
      averageIterations: 0,
      averageDuration: 0,
      criticalErrors: 0,
      deploymentFailures: 0
    };
  }

  /**
   * Report validation results to monitoring service
   */
  async reportValidationResults(results) {
    if (!this.config.enabled) {
      console.log('📊 Monitoring disabled, skipping metric reporting');
      return;
    }

    try {
      // Update internal metrics
      this.updateMetrics(results);

      // Send to monitoring service
      await this.sendMetrics(results);

      console.log('📈 Metrics reported to monitoring service');
    } catch (error) {
      console.error('❌ Failed to report metrics:', error.message);
    }
  }

  /**
   * Update internal metrics tracking
   */
  updateMetrics(results) {
    this.metrics.validationRuns++;
    this.metrics.errorsFound += results.summary.totalErrors || 0;
    this.metrics.errorsFixed += results.summary.fixedErrors || 0;

    if (results.summary.fixSuccessRate !== undefined) {
      // Running average of fix success rate
      const prevRate = this.metrics.fixSuccessRate;
      const runs = this.metrics.validationRuns;
      this.metrics.fixSuccessRate = ((prevRate * (runs - 1)) + results.summary.fixSuccessRate) / runs;
    }

    if (results.summary.iterations !== undefined) {
      // Running average of iterations
      const prevIter = this.metrics.averageIterations;
      const runs = this.metrics.validationRuns;
      this.metrics.averageIterations = ((prevIter * (runs - 1)) + results.summary.iterations) / runs;
    }

    if (results.summary.duration !== undefined) {
      // Running average of duration
      const prevDur = this.metrics.averageDuration;
      const runs = this.metrics.validationRuns;
      this.metrics.averageDuration = ((prevDur * (runs - 1)) + results.summary.duration) / runs;
    }

    // Count critical errors
    const criticalErrors = (results.errors || []).filter(error =>
      error.severity === 'CRITICAL'
    ).length;
    this.metrics.criticalErrors += criticalErrors;

    // Track deployment failures
    if (results.summary.status === 'failed' && results.context === 'deployment') {
      this.metrics.deploymentFailures++;
    }
  }

  /**
   * Send metrics to monitoring service (override in subclasses)
   */
  async sendMetrics(results) {
    console.log('📊 Validation metrics:', {
      status: results.summary.status,
      totalErrors: results.summary.totalErrors,
      fixedErrors: results.summary.fixedErrors,
      fixSuccessRate: results.summary.fixSuccessRate,
      duration: Math.round(results.summary.duration / 1000) + 's'
    });
  }

  /**
   * Create alert for critical issues
   */
  async createAlert(severity, message, details = {}) {
    if (!this.config.enabled) return;

    const alert = {
      timestamp: new Date().toISOString(),
      severity,
      message,
      service: 'validation-system',
      environment: this.config.environment,
      details,
      runId: process.env.GITHUB_RUN_ID,
      repository: process.env.GITHUB_REPOSITORY
    };

    console.log(`🚨 Alert [${severity}]: ${message}`);

    try {
      await this.sendAlert(alert);
    } catch (error) {
      console.error('❌ Failed to send alert:', error.message);
    }
  }

  /**
   * Send alert (override in subclasses)
   */
  async sendAlert(alert) {
    console.log('🚨 Alert details:', alert);
  }

  /**
   * Health check for monitoring system
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      config: {
        enabled: this.config.enabled,
        service: this.config.service,
        environment: this.config.environment
      }
    };
  }
}

/**
 * DataDog monitoring integration
 */
class DataDogIntegration extends MonitoringIntegration {
  constructor(config = {}) {
    super(config);
    this.apiKey = process.env.DATADOG_API_KEY;
    this.host = process.env.DATADOG_HOST || 'api.datadoghq.com';
    this.prefix = 'validation.';
  }

  async sendMetrics(results) {
    if (!this.apiKey) {
      console.log('⚠️ DataDog API key not configured, using console logging');
      return super.sendMetrics(results);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const metrics = [
      {
        metric: this.prefix + 'errors.total',
        points: [[timestamp, results.summary.totalErrors || 0]],
        type: 'gauge',
        tags: [`environment:${this.config.environment}`]
      },
      {
        metric: this.prefix + 'errors.fixed',
        points: [[timestamp, results.summary.fixedErrors || 0]],
        type: 'gauge',
        tags: [`environment:${this.config.environment}`]
      },
      {
        metric: this.prefix + 'fix.success_rate',
        points: [[timestamp, results.summary.fixSuccessRate || 0]],
        type: 'gauge',
        tags: [`environment:${this.config.environment}`]
      },
      {
        metric: this.prefix + 'iterations',
        points: [[timestamp, results.summary.iterations || 0]],
        type: 'gauge',
        tags: [`environment:${this.config.environment}`]
      },
      {
        metric: this.prefix + 'duration',
        points: [[timestamp, results.summary.duration || 0]],
        type: 'gauge',
        tags: [`environment:${this.config.environment}`]
      }
    ];

    // Add error severity breakdown
    if (results.metrics && results.metrics.errorsBySeverity) {
      Object.entries(results.metrics.errorsBySeverity).forEach(([severity, count]) => {
        metrics.push({
          metric: this.prefix + `errors.severity.${severity.toLowerCase()}`,
          points: [[timestamp, count]],
          type: 'gauge',
          tags: [`environment:${this.config.environment}`, `severity:${severity}`]
        });
      });
    }

    return this.postToDataDog('/api/v1/series', { series: metrics });
  }

  async sendAlert(alert) {
    if (!this.apiKey) {
      return super.sendAlert(alert);
    }

    const payload = {
      title: `Validation Alert: ${alert.message}`,
      text: JSON.stringify(alert.details, null, 2),
      alert_type: alert.severity.toLowerCase(),
      source_type_name: 'validation-system',
      tags: [
        `environment:${alert.environment}`,
        `repository:${alert.repository || 'unknown'}`,
        'validation'
      ]
    };

    return this.postToDataDog('/api/v1/events', payload);
  }

  async postToDataDog(endpoint, payload) {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: this.host,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'DD-API-KEY': this.apiKey
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data || '{}'));
          } else {
            reject(new Error(`DataDog API error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

/**
 * Prometheus monitoring integration
 */
class PrometheusIntegration extends MonitoringIntegration {
  constructor(config = {}) {
    super(config);
    this.gateway = process.env.PROMETHEUS_GATEWAY || 'localhost:9091';
    this.job = 'validation-system';
  }

  async sendMetrics(results) {
    if (!this.gateway) {
      console.log('⚠️ Prometheus gateway not configured, using console logging');
      return super.sendMetrics(results);
    }

    const metrics = this.formatPrometheusMetrics(results);
    return this.pushToGateway(metrics);
  }

  formatPrometheusMetrics(results) {
    const timestamp = Date.now();
    const labels = `{environment="${this.config.environment}"}`;

    return [
      `validation_errors_total${labels} ${results.summary.totalErrors || 0} ${timestamp}`,
      `validation_errors_fixed${labels} ${results.summary.fixedErrors || 0} ${timestamp}`,
      `validation_fix_success_rate${labels} ${results.summary.fixSuccessRate || 0} ${timestamp}`,
      `validation_iterations${labels} ${results.summary.iterations || 0} ${timestamp}`,
      `validation_duration_seconds${labels} ${Math.round((results.summary.duration || 0) / 1000)} ${timestamp}`,
      `validation_runs_total${labels} ${this.metrics.validationRuns} ${timestamp}`
    ].join('\n');
  }

  async pushToGateway(metrics) {
    const [host, port] = this.gateway.split(':');
    const postData = metrics;

    const options = {
      hostname: host,
      port: port || 9091,
      path: `/metrics/job/${this.job}`,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Prometheus gateway error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

/**
 * Slack notification integration
 */
class SlackIntegration extends MonitoringIntegration {
  constructor(config = {}) {
    super(config);
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.channel = process.env.SLACK_CHANNEL || '#validation';
  }

  async sendAlert(alert) {
    if (!this.webhookUrl) {
      console.log('⚠️ Slack webhook not configured, using console logging');
      return super.sendAlert(alert);
    }

    const color = {
      critical: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    }[alert.severity.toLowerCase()] || '#6c757d';

    const payload = {
      channel: this.channel,
      username: 'Validation Bot',
      icon_emoji: ':robot_face:',
      attachments: [{
        color: color,
        title: `🔍 Validation Alert - ${alert.severity}`,
        text: alert.message,
        fields: [
          {
            title: 'Environment',
            value: alert.environment,
            short: true
          },
          {
            title: 'Repository',
            value: alert.repository || 'Unknown',
            short: true
          },
          {
            title: 'Time',
            value: new Date(alert.timestamp).toLocaleString(),
            short: true
          },
          {
            title: 'Run ID',
            value: alert.runId || 'Unknown',
            short: true
          }
        ],
        footer: 'Validation System',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };

    return this.postToSlack(payload);
  }

  async reportValidationResults(results) {
    if (!this.config.enabled || !this.webhookUrl) {
      return super.reportValidationResults(results);
    }

    // Only send notifications for failures or significant issues
    if (results.summary.status === 'success' && (results.summary.totalErrors || 0) === 0) {
      return;
    }

    const statusEmoji = results.summary.status === 'success' ? '✅' : '❌';
    const color = results.summary.status === 'success' ? '#28a745' : '#dc3545';

    const payload = {
      channel: this.channel,
      username: 'Validation Bot',
      icon_emoji: ':mag:',
      attachments: [{
        color: color,
        title: `${statusEmoji} Validation Results`,
        fields: [
          {
            title: 'Status',
            value: results.summary.status.toUpperCase(),
            short: true
          },
          {
            title: 'Errors Found',
            value: results.summary.totalErrors || 0,
            short: true
          },
          {
            title: 'Errors Fixed',
            value: results.summary.fixedErrors || 0,
            short: true
          },
          {
            title: 'Fix Success Rate',
            value: `${results.summary.fixSuccessRate || 0}%`,
            short: true
          },
          {
            title: 'Duration',
            value: `${Math.round((results.summary.duration || 0) / 1000)}s`,
            short: true
          },
          {
            title: 'Iterations',
            value: results.summary.iterations || 0,
            short: true
          }
        ],
        footer: 'Validation System',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    return this.postToSlack(payload);
  }

  async postToSlack(payload) {
    const url = new URL(this.webhookUrl);
    const postData = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Slack webhook error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

/**
 * Monitoring factory - creates appropriate monitoring instance
 */
class MonitoringFactory {
  static create(service = null) {
    const serviceName = service || process.env.MONITORING_SERVICE || 'console';

    switch (serviceName.toLowerCase()) {
      case 'datadog':
        return new DataDogIntegration();
      case 'prometheus':
        return new PrometheusIntegration();
      case 'slack':
        return new SlackIntegration();
      case 'console':
      default:
        return new MonitoringIntegration();
    }
  }

  /**
   * Create multiple monitoring instances
   */
  static createMultiple(services) {
    return services.map(service => this.create(service));
  }
}

/**
 * Composite monitoring - sends to multiple services
 */
class CompositeMonitoring {
  constructor(monitors = []) {
    this.monitors = monitors.length > 0 ? monitors : [MonitoringFactory.create()];
  }

  async reportValidationResults(results) {
    const promises = this.monitors.map(monitor =>
      monitor.reportValidationResults(results).catch(error => {
        console.error(`Monitor ${monitor.constructor.name} failed:`, error.message);
      })
    );

    await Promise.allSettled(promises);
  }

  async createAlert(severity, message, details) {
    const promises = this.monitors.map(monitor =>
      monitor.createAlert(severity, message, details).catch(error => {
        console.error(`Monitor ${monitor.constructor.name} alert failed:`, error.message);
      })
    );

    await Promise.allSettled(promises);
  }

  async healthCheck() {
    const results = await Promise.allSettled(
      this.monitors.map(monitor => monitor.healthCheck())
    );

    return {
      status: results.every(r => r.status === 'fulfilled') ? 'healthy' : 'degraded',
      monitors: results.map((result, index) => ({
        name: this.monitors[index].constructor.name,
        status: result.status === 'fulfilled' ? 'healthy' : 'failed',
        details: result.status === 'fulfilled' ? result.value : result.reason.message
      }))
    };
  }
}

// Export classes and factory
module.exports = {
  MonitoringIntegration,
  DataDogIntegration,
  PrometheusIntegration,
  SlackIntegration,
  MonitoringFactory,
  CompositeMonitoring
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'test') {
    // Test monitoring integration
    const monitoring = MonitoringFactory.create();

    const testResults = {
      timestamp: new Date().toISOString(),
      summary: {
        status: 'success',
        totalErrors: 5,
        fixedErrors: 4,
        fixSuccessRate: 80,
        iterations: 3,
        duration: 45000
      },
      metrics: {
        errorsBySeverity: {
          CRITICAL: 1,
          HIGH: 2,
          MEDIUM: 2
        }
      }
    };

    monitoring.reportValidationResults(testResults)
      .then(() => console.log('✅ Test monitoring report sent'))
      .catch(error => console.error('❌ Test failed:', error.message));

  } else if (command === 'health') {
    // Health check
    const monitoring = MonitoringFactory.create();

    monitoring.healthCheck()
      .then(health => console.log('Health check:', JSON.stringify(health, null, 2)))
      .catch(error => console.error('Health check failed:', error.message));

  } else {
    console.log(`
🔍 Monitoring Integration CLI

Usage:
  node monitoring.js <command>

Commands:
  test      Test monitoring integration with sample data
  health    Check monitoring system health

Environment Variables:
  MONITORING_ENABLED      Enable/disable monitoring (true/false)
  MONITORING_SERVICE      Service type (console/datadog/prometheus/slack)
  DATADOG_API_KEY        DataDog API key
  SLACK_WEBHOOK_URL      Slack webhook URL
  PROMETHEUS_GATEWAY     Prometheus pushgateway address
`);
  }
}