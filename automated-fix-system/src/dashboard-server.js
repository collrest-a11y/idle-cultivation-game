import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { Logger } from './logger.js';

export class DashboardServer {
  constructor(system) {
    this.system = system;
    this.logger = new Logger('Dashboard');
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    this.port = parseInt(process.env.DASHBOARD_PORT || '3003');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  setupMiddleware() {
    // Security
    if (process.env.ENABLE_HELMET === 'true') {
      this.app.use(helmet({
        contentSecurityPolicy: false
      }));
    }

    // CORS
    if (process.env.ENABLE_CORS === 'true') {
      this.app.use(cors({
        origin: process.env.CORS_ORIGIN || '*'
      }));
    }

    // Compression
    this.app.use(compression());

    // JSON parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use(express.static(path.join(process.cwd(), 'dashboard')));
  }

  setupRoutes() {
    // API endpoints
    this.app.get('/api/stats', (req, res) => {
      res.json(this.system.getStats());
    });

    this.app.get('/api/errors', (req, res) => {
      res.json({
        queue: this.system.errorMonitor.errorQueue,
        recent: Array.from(this.system.errorMonitor.recentErrors.keys())
      });
    });

    this.app.get('/api/fixes', (req, res) => {
      res.json({
        history: this.system.claudeService.fixHistory,
        recent: Array.from(this.system.claudeService.recentFixes.entries())
      });
    });

    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: this.system.errorMonitor.connections.size
      });
    });

    // Injection script
    this.app.get('/inject.js', async (req, res) => {
      const { browserScript } = await import('./error-monitor.js');
      res.type('application/javascript');
      res.send(browserScript);
    });

    // Dashboard HTML
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });
  }

  setupSocketIO() {
    this.io.on('connection', (socket) => {
      this.logger.info('Dashboard client connected');

      // Send initial stats
      socket.emit('stats', this.system.getStats());

      // Send updates every second
      const interval = setInterval(() => {
        socket.emit('stats', this.system.getStats());
      }, 1000);

      socket.on('disconnect', () => {
        clearInterval(interval);
        this.logger.info('Dashboard client disconnected');
      });

      // Handle manual fix requests
      socket.on('applyFix', async (data) => {
        try {
          const result = await this.system.claudeService.applyFix(data.fix, data.error);
          socket.emit('fixResult', result);
        } catch (error) {
          socket.emit('fixResult', { success: false, error: error.message });
        }
      });
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        this.logger.info(`Dashboard running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('Dashboard server stopped');
        resolve();
      });
    });
  }

  getDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automated Fix System Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        h1 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 30px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
        }

        .card h2 {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #ffd700;
        }

        .stat {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
        }

        .stat-value {
            font-weight: bold;
            font-size: 1.2rem;
        }

        .success { color: #4ade80; }
        .error { color: #f87171; }
        .warning { color: #fbbf24; }
        .info { color: #60a5fa; }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }

        .status-active { background: #4ade80; }
        .status-inactive { background: #f87171; }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .error-log {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }

        .error-item {
            padding: 8px;
            margin: 5px 0;
            background: rgba(248, 113, 113, 0.1);
            border-left: 3px solid #f87171;
            border-radius: 5px;
        }

        .fix-item {
            padding: 8px;
            margin: 5px 0;
            background: rgba(74, 222, 128, 0.1);
            border-left: 3px solid #4ade80;
            border-radius: 5px;
        }

        .progress-bar {
            width: 100%;
            height: 30px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            overflow: hidden;
            margin: 15px 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4ade80 0%, #60a5fa 100%);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: opacity 0.3s;
        }

        button:hover {
            opacity: 0.9;
        }

        #connectionStatus {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 20px;
            display: flex;
            align-items: center;
        }
    </style>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <div id="connectionStatus">
        <span class="status-indicator status-inactive" id="statusIndicator"></span>
        <span id="statusText">Connecting...</span>
    </div>

    <div class="container">
        <h1>🤖 Automated Fix System Dashboard</h1>

        <div class="dashboard">
            <div class="card">
                <h2>📊 System Status</h2>
                <div class="stat">
                    <span>Status</span>
                    <span class="stat-value success" id="systemStatus">Active</span>
                </div>
                <div class="stat">
                    <span>Uptime</span>
                    <span class="stat-value" id="uptime">0s</span>
                </div>
                <div class="stat">
                    <span>Connections</span>
                    <span class="stat-value info" id="connections">0</span>
                </div>
                <div class="stat">
                    <span>Queue Size</span>
                    <span class="stat-value warning" id="queueSize">0</span>
                </div>
            </div>

            <div class="card">
                <h2>🔧 Fix Statistics</h2>
                <div class="stat">
                    <span>Total Errors</span>
                    <span class="stat-value" id="totalErrors">0</span>
                </div>
                <div class="stat">
                    <span>Fixed</span>
                    <span class="stat-value success" id="errorsFixed">0</span>
                </div>
                <div class="stat">
                    <span>Failed</span>
                    <span class="stat-value error" id="errorsFailed">0</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="successRate" style="width: 0%">
                        <span id="successRateText">0%</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>🧠 Claude AI</h2>
                <div class="stat">
                    <span>API Requests</span>
                    <span class="stat-value" id="apiRequests">0</span>
                </div>
                <div class="stat">
                    <span>Avg Confidence</span>
                    <span class="stat-value info" id="avgConfidence">0%</span>
                </div>
                <div class="stat">
                    <span>Recent Fixes</span>
                    <span class="stat-value" id="recentFixes">0</span>
                </div>
                <div class="stat">
                    <span>Rate Limit</span>
                    <span class="stat-value warning" id="rateLimit">0/100</span>
                </div>
            </div>
        </div>

        <div class="dashboard">
            <div class="card" style="grid-column: span 2;">
                <h2>🚨 Recent Errors</h2>
                <div class="error-log" id="errorLog">
                    <div style="color: #888; text-align: center;">No errors yet...</div>
                </div>
            </div>

            <div class="card">
                <h2>✅ Recent Fixes</h2>
                <div class="error-log" id="fixLog">
                    <div style="color: #888; text-align: center;">No fixes applied yet...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let stats = {};

        socket.on('connect', () => {
            document.getElementById('statusIndicator').className = 'status-indicator status-active';
            document.getElementById('statusText').textContent = 'Connected';
        });

        socket.on('disconnect', () => {
            document.getElementById('statusIndicator').className = 'status-indicator status-inactive';
            document.getElementById('statusText').textContent = 'Disconnected';
        });

        socket.on('stats', (data) => {
            stats = data;
            updateDashboard();
        });

        function updateDashboard() {
            // Update system status
            document.getElementById('uptime').textContent = formatUptime(stats.uptime);
            document.getElementById('connections').textContent = stats.monitor?.connections || 0;
            document.getElementById('queueSize').textContent = stats.monitor?.queueSize || 0;

            // Update fix statistics
            document.getElementById('totalErrors').textContent = stats.totalErrors || 0;
            document.getElementById('errorsFixed').textContent = stats.errorsFixed || 0;
            document.getElementById('errorsFailed').textContent = stats.errorsFailed || 0;

            // Update success rate
            const successRate = stats.successRate || 0;
            document.getElementById('successRate').style.width = successRate + '%';
            document.getElementById('successRateText').textContent = successRate + '%';

            // Update Claude stats
            document.getElementById('apiRequests').textContent = stats.claude?.requestCount || 0;
            document.getElementById('avgConfidence').textContent =
                Math.round(stats.claude?.averageConfidence || 0) + '%';
            document.getElementById('recentFixes').textContent = stats.claude?.recentFixes || 0;
            document.getElementById('rateLimit').textContent =
                (stats.claude?.requestCount || 0) + '/100';
        }

        function formatUptime(seconds) {
            if (!seconds) return '0s';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (hours > 0) {
                return hours + 'h ' + minutes + 'm';
            } else if (minutes > 0) {
                return minutes + 'm ' + secs + 's';
            } else {
                return secs + 's';
            }
        }

        // Fetch initial data
        fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
                stats = data;
                updateDashboard();
            });
    </script>
</body>
</html>`;
  }
}