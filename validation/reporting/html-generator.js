/**
 * HTML Generator for Validation & Fix Loop Reports
 * Creates comprehensive, interactive HTML dashboards with real-time capabilities
 */

export function createReport(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validation & Fix Loop Dashboard - ${data.session.id}</title>
  <style>
    :root {
      --primary: #667eea;
      --secondary: #764ba2;
      --success: #4caf50;
      --warning: #ff9800;
      --danger: #f44336;
      --info: #2196f3;
      --dark: #333;
      --light: #f5f5f5;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--light);
      color: var(--dark);
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header-info div {
      opacity: 0.9;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      border: 1px solid #e0e0e0;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }

    .card h3 {
      color: var(--dark);
      margin-bottom: 20px;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border-left: 4px solid var(--primary);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .metric-value {
      font-size: 2.2rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 5px;
    }

    .metric-label {
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .progress-container {
      margin: 20px 0;
    }

    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--success), #8bc34a);
      transition: width 0.8s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .chart-container {
      position: relative;
      height: 300px;
      margin: 20px 0;
      background: #fafafa;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
    }

    .error-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }

    .error-item {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-item:last-child {
      border-bottom: none;
    }

    .error-severity {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-critical {
      background: var(--danger);
      color: white;
    }

    .severity-high {
      background: #ff6b6b;
      color: white;
    }

    .severity-medium {
      background: var(--warning);
      color: white;
    }

    .severity-low {
      background: #6c757d;
      color: white;
    }

    .status-fixed {
      color: var(--success);
      font-weight: 600;
    }

    .status-attempted {
      color: var(--warning);
      font-weight: 600;
    }

    .status-pending {
      color: #6c757d;
      font-weight: 600;
    }

    .tabs {
      display: flex;
      border-bottom: 2px solid #e0e0e0;
      margin-bottom: 20px;
      overflow-x: auto;
    }

    .tab {
      padding: 12px 24px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.3s;
      white-space: nowrap;
      font-weight: 500;
    }

    .tab:hover {
      background: #f5f5f5;
    }

    .tab.active {
      border-bottom-color: var(--primary);
      color: var(--primary);
      font-weight: 600;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .trend-indicator {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .trend-improving {
      background: #d4edda;
      color: #155724;
    }

    .trend-worsening {
      background: #f8d7da;
      color: #721c24;
    }

    .trend-stable {
      background: #fff3cd;
      color: #856404;
    }

    .recommendations {
      background: #e3f2fd;
      border-left: 4px solid var(--info);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .risk-areas {
      background: #ffebee;
      border-left: 4px solid var(--danger);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .pattern-list {
      list-style: none;
    }

    .pattern-item {
      padding: 10px;
      margin: 5px 0;
      border-left: 3px solid var(--warning);
      background: #fff8e1;
      border-radius: 4px;
    }

    .pattern-high {
      border-left-color: var(--danger);
      background: #ffebee;
    }

    .health-score {
      text-align: center;
      margin: 20px 0;
    }

    .health-circle {
      display: inline-block;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: bold;
      color: white;
      margin-bottom: 10px;
    }

    .health-excellent { background: var(--success); }
    .health-good { background: #8bc34a; }
    .health-fair { background: var(--warning); }
    .health-poor { background: #ff6b6b; }
    .health-critical { background: var(--danger); }

    .real-time-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
    }

    .pulse {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .performance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }

    .performance-metric {
      background: white;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid var(--info);
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }

    .metric-title {
      font-weight: 600;
      color: var(--dark);
      margin-bottom: 8px;
    }

    .metric-data {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }

      .header h1 {
        font-size: 2rem;
      }

      .header-info {
        flex-direction: column;
        align-items: flex-start;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .metrics-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="real-time-indicator">
    <div class="pulse"></div>
    Live Dashboard
  </div>

  <div class="container">
    <div class="header">
      <h1>🚀 Validation & Fix Loop Dashboard</h1>
      <div class="header-info">
        <div>
          <strong>Session:</strong> ${data.session.id}
        </div>
        <div>
          <strong>Generated:</strong> ${new Date(data.timestamp).toLocaleString()}
        </div>
        <div>
          <strong>Duration:</strong> ${data.summary.duration}
        </div>
        <div>
          <strong>Status:</strong> ${data.session.status || 'Running'}
        </div>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${data.summary.iterations}</div>
        <div class="metric-label">Iterations</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.summary.totalErrors}</div>
        <div class="metric-label">Total Errors</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.summary.fixedErrors}</div>
        <div class="metric-label">Fixed Errors</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.summary.fixSuccessRate}</div>
        <div class="metric-label">Fix Success Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.summary.convergenceRate}</div>
        <div class="metric-label">Convergence Rate</div>
      </div>
    </div>

    <!-- Progress Overview -->
    <div class="card">
      <h3>📊 Overall Progress</h3>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(data.summary.fixedErrors / Math.max(1, data.summary.totalErrors) * 100).toFixed(0)}%">
            ${data.summary.fixedErrors} / ${data.summary.totalErrors} Fixed
          </div>
        </div>
      </div>
      <p style="margin-top: 10px; color: #666;">
        <strong>Error Trend:</strong>
        <span class="trend-indicator trend-${data.metrics.errorTrend}">
          ${data.metrics.errorTrend === 'improving' ? '↓' : data.metrics.errorTrend === 'worsening' ? '↑' : '→'}
          ${data.metrics.errorTrend}
        </span>
      </p>
    </div>

    <!-- Dashboard Tabs -->
    <div class="tabs">
      <div class="tab active" onclick="showTab('overview')">Overview</div>
      <div class="tab" onclick="showTab('errors')">Error Analysis</div>
      <div class="tab" onclick="showTab('performance')">Performance</div>
      <div class="tab" onclick="showTab('trends')">Trends</div>
      <div class="tab" onclick="showTab('recommendations')">Recommendations</div>
    </div>

    <!-- Overview Tab -->
    <div id="overview" class="tab-content active">
      <div class="dashboard-grid">
        <!-- Error Distribution -->
        <div class="card">
          <h3>⚠️ Error Distribution by Severity</h3>
          <div style="margin-top: 20px;">
            ${Object.entries(data.metrics.errorsBySeverity || {}).map(([severity, count]) => `
              <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                <span class="error-severity severity-${severity.toLowerCase()}">${severity}</span>
                <strong>${count}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Component Analysis -->
        <div class="card">
          <h3>🔧 Errors by Component</h3>
          <div style="margin-top: 20px;">
            ${Object.entries(data.metrics.errorsByComponent || {}).slice(0, 8).map(([component, count]) => `
              <div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 6px; background: #f8f9fa; border-radius: 4px;">
                <span>${component}</span>
                <strong>${count}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- System Health -->
        <div class="card">
          <h3>💊 System Health</h3>
          <div class="health-score">
            <div class="health-circle health-${data.trends.systemHealth.grade.toLowerCase()}">
              ${data.trends.systemHealth.score}
            </div>
            <div>
              <strong>${data.trends.systemHealth.grade}</strong>
              <p style="color: #666; margin-top: 5px;">${data.trends.systemHealth.recommendation}</p>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
          <h3>📝 Recent Activity</h3>
          <div class="error-list" style="max-height: 200px;">
            ${data.session.fixes.slice(-10).reverse().map(fix => {
              const error = data.session.errors.find(e => e.id === fix.errorId);
              return `
                <div class="error-item">
                  <div>
                    <strong>${error ? error.type : 'Unknown'}</strong><br>
                    <small style="color: #666;">${new Date(fix.timestamp).toLocaleTimeString()}</small>
                  </div>
                  <span class="status-${fix.result}">${fix.result.toUpperCase()}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Error Analysis Tab -->
    <div id="errors" class="tab-content">
      <div class="dashboard-grid">
        <div class="card">
          <h3>🐛 Error Details</h3>
          <div class="error-list">
            ${data.session.errors.slice(0, 20).map(error => `
              <div class="error-item">
                <div>
                  <strong>${error.type}</strong><br>
                  <small>${error.message}</small><br>
                  <small style="color: #666;">Component: ${error.component} | ${new Date(error.timestamp).toLocaleTimeString()}</small>
                </div>
                <div style="text-align: right;">
                  <div class="error-severity severity-${error.severity.toLowerCase()}">${error.severity}</div>
                  <small class="status-${error.status || 'pending'}">${error.status || 'pending'}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h3>🔍 Pattern Analysis</h3>
          <ul class="pattern-list">
            ${data.analysis.patterns.map(pattern => `
              <li class="pattern-item ${pattern.severity === 'high' ? 'pattern-high' : ''}">
                <strong>${pattern.type}:</strong> ${pattern.description}
                <br><small>Impact: ${pattern.impact}</small>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>

    <!-- Performance Tab -->
    <div id="performance" class="tab-content">
      <div class="performance-grid">
        ${data.analysis.performanceInsights.map(insight => `
          <div class="performance-metric">
            <div class="metric-title">${insight.metric.replace(/-/g, ' ').toUpperCase()}</div>
            <div class="metric-data">
              <div>
                ${insight.average !== undefined ? `Avg: ${insight.average}${insight.metric.includes('memory') ? 'MB' : 'ms'}` : ''}
                ${insight.averageMB !== undefined ? `Avg: ${insight.averageMB}MB` : ''}
                ${insight.min !== undefined ? `<br>Min: ${insight.min}ms` : ''}
                ${insight.max !== undefined ? `<br>Max: ${insight.max}ms` : ''}
              </div>
              <span class="trend-indicator trend-${insight.trend}">
                ${insight.trend === 'improving' ? '↓' : insight.trend === 'worsening' ? '↑' : '→'}
                ${insight.trend}
              </span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h3>⚡ Performance Bottlenecks</h3>
        ${data.analysis.bottlenecks.length > 0 ? `
          <ul style="list-style: none; padding: 0;">
            ${data.analysis.bottlenecks.map(bottleneck => `
              <li style="margin: 15px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <strong>${bottleneck.type}:</strong> ${bottleneck.description}
                <br><small style="color: #666;">Impact: ${bottleneck.impact}</small>
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #666; text-align: center; padding: 40px;">No significant bottlenecks detected</p>'}
      </div>
    </div>

    <!-- Trends Tab -->
    <div id="trends" class="tab-content">
      <div class="dashboard-grid">
        <div class="card">
          <h3>📈 Error Trends</h3>
          <div class="chart-container">
            <div style="text-align: center;">
              <p><strong>Error Trend:</strong>
                <span class="trend-indicator trend-${data.trends.errorTrends.trend}">
                  ${data.trends.errorTrends.trend}
                </span>
              </p>
              <p style="margin-top: 10px;"><strong>Reduction:</strong> ${data.trends.errorTrends.reduction}%</p>
              <small style="color: #666;">Chart visualization would be implemented with a charting library</small>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>🎯 Fix Effectiveness</h3>
          <div class="chart-container">
            <div style="text-align: center;">
              <p><strong>Average Success Rate:</strong> ${data.trends.fixEffectiveness.averageSuccessRate}%</p>
              <p style="margin-top: 10px;"><strong>Trend:</strong>
                <span class="trend-indicator trend-${data.trends.fixEffectiveness.trend}">
                  ${data.trends.fixEffectiveness.trend}
                </span>
              </p>
              <small style="color: #666;">Detailed effectiveness charts would be rendered here</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendations Tab -->
    <div id="recommendations" class="tab-content">
      ${data.analysis.improvements.length > 0 ? `
        <div class="recommendations">
          <h3 style="margin-bottom: 15px;">💡 Improvement Recommendations</h3>
          ${data.analysis.improvements.map(improvement => `
            <div style="margin: 15px 0; padding: 10px; border-left: 3px solid var(--info); background: white; border-radius: 4px;">
              <strong>${improvement.area}:</strong> ${improvement.suggestion}
              <br><small style="color: #666;">Priority: ${improvement.priority} | Impact: ${improvement.impact}</small>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${data.analysis.riskAreas.length > 0 ? `
        <div class="risk-areas">
          <h3 style="margin-bottom: 15px;">⚠️ Risk Areas</h3>
          ${data.analysis.riskAreas.map(risk => `
            <div style="margin: 15px 0; padding: 10px; border-left: 3px solid var(--danger); background: white; border-radius: 4px;">
              <strong>${risk.level.toUpperCase()} RISK:</strong> ${risk.description}
              <br><small style="color: #666;">Category: ${risk.category} | Impact: ${risk.impact}</small>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${data.recommendations.length > 0 ? `
        <div class="card">
          <h3>📋 Action Items</h3>
          <ul style="list-style: none; padding: 0;">
            ${data.recommendations.map(rec => `
              <li style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid var(--primary); border-radius: 4px;">
                ${rec.message || rec.action}
                ${rec.priority ? `<br><small style="color: #666;">Priority: ${rec.priority}</small>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="margin-top: 50px; text-align: center; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      <p>Generated by Validation & Fix Loop Reporting System v1.0</p>
      <p>Last updated: ${new Date().toLocaleString()}</p>
    </div>
  </div>

  <script>
    function showTab(tabName) {
      // Hide all tab contents
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });

      // Remove active class from all tabs
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });

      // Show selected tab content
      document.getElementById(tabName).classList.add('active');

      // Add active class to selected tab
      event.target.classList.add('active');
    }

    // Auto-refresh functionality (if connected to real-time data source)
    function refreshDashboard() {
      // This would fetch updated data in a real implementation
      console.log('Dashboard refresh triggered');
    }

    // Set up auto-refresh every 30 seconds (disabled by default)
    // setInterval(refreshDashboard, 30000);

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (e.altKey) {
        switch(e.key) {
          case '1': showTab('overview'); break;
          case '2': showTab('errors'); break;
          case '3': showTab('performance'); break;
          case '4': showTab('trends'); break;
          case '5': showTab('recommendations'); break;
        }
      }
    });

    console.log('Validation & Fix Loop Dashboard loaded');
  </script>
</body>
</html>
  `;
}