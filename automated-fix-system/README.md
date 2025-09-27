# 🤖 Automated Fix System

A production-ready automated error detection and fix system powered by Claude AI that monitors your game in real-time and automatically fixes errors as they occur.

## ✨ Features

- **Real-time Error Detection**: Captures all JavaScript errors, promise rejections, and console errors
- **AI-Powered Fix Generation**: Uses Claude AI to analyze errors and generate intelligent fixes
- **Automated Validation**: Tests fixes before applying them to ensure they don't break anything
- **Live Dashboard**: Beautiful real-time dashboard to monitor system activity
- **Production Ready**: Docker support, logging, rate limiting, and security features
- **Hot Reload**: Automatically refreshes your game when fixes are applied

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Anthropic API key (get from [console.anthropic.com](https://console.anthropic.com))
- Your game running on http://localhost:8080 (or configure in .env)

### Installation

1. **Run the setup script:**

   **Windows:**
   ```bash
   start.bat
   ```

   **Mac/Linux:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Configure your API key:**
   - Copy `.env.example` to `.env`
   - Add your Anthropic API key

3. **Start the system:**
   ```bash
   npm start
   ```

4. **Add to your game:**
   Add this script tag to your game's HTML:
   ```html
   <script src="http://localhost:3003/inject.js"></script>
   ```

5. **Open the dashboard:**
   http://localhost:3003

## 📊 Dashboard

The dashboard shows:
- Real-time error monitoring
- Fix success rate
- Claude AI statistics
- System performance metrics
- Recent errors and fixes

## 🔧 Configuration

Edit `.env` file to configure:

```env
# Claude API
ANTHROPIC_API_KEY=your-key-here
CLAUDE_MODEL=claude-3-haiku-20240307  # or claude-3-opus-20240229 for complex fixes

# System Settings
AUTO_APPLY_FIXES=false  # Set to true for automatic fix application
CONFIDENCE_THRESHOLD=75  # Minimum confidence to apply fixes
MAX_FIXES_PER_HOUR=100  # Rate limiting

# Ports
WS_PORT=3002  # WebSocket for error monitoring
DASHBOARD_PORT=3003  # Dashboard web interface
```

## 🐳 Docker Deployment

Run with Docker:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f fix-system

# Stop
docker-compose down
```

## 📚 How It Works

1. **Error Detection**: JavaScript errors are captured in your game
2. **Context Collection**: Error details, stack traces, and user actions are collected
3. **AI Analysis**: Claude analyzes the error and generates a fix
4. **Validation**: Fix is tested in isolation before applying
5. **Application**: If tests pass, fix is applied to your code
6. **Hot Reload**: Your game reloads with the fix applied

## 🛡️ Safety Features

- **Validation Pipeline**: All fixes are validated before applying
- **Rollback Support**: Automatic backup and rollback if fixes fail
- **Rate Limiting**: Prevents excessive API usage
- **Confidence Threshold**: Only applies high-confidence fixes
- **Manual Review**: Option to review fixes before applying

## 📝 API Endpoints

- `GET /api/stats` - System statistics
- `GET /api/errors` - Error queue
- `GET /api/fixes` - Fix history
- `GET /api/health` - Health check
- `GET /inject.js` - Browser injection script

## 🔍 Monitoring

View real-time metrics:
- Total errors detected
- Fixes applied successfully
- Current error queue size
- API usage and rate limits
- System uptime and performance

## 💰 Cost Management

- Uses Claude Haiku by default (cheaper, faster)
- Switch to Opus for complex fixes
- Rate limiting prevents excessive costs
- Monitor usage in dashboard
- Typical cost: $0.01-0.03 per fix

## 🐛 Troubleshooting

### System won't start
- Check Node.js version (18+ required)
- Verify API key in .env file
- Check port availability

### No errors detected
- Verify injection script is added to game
- Check WebSocket connection (port 3002)
- Look for connection status in dashboard

### Fixes not applying
- Check AUTO_APPLY_FIXES setting
- Review confidence threshold
- Check file permissions

## 📖 Architecture

```
Your Game → Error Monitor → Claude AI → Validation → Application
     ↑                                                      ↓
     └────────────────── Hot Reload ←──────────────────────┘
```

## 🤝 Contributing

Pull requests welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create an issue on GitHub
- Check the dashboard for system status
- Review logs in the `logs/` directory

---

Built with ❤️ using Claude AI, Node.js, and modern web technologies.