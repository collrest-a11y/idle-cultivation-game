#!/bin/bash

echo "🤖 Automated Fix System Setup"
echo "=============================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your Anthropic API key!"
    echo "   Get your key from: https://console.anthropic.com/"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p dashboard

# Check for Docker (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker detected"
    echo "   You can use 'npm run docker:up' to run in Docker"
else
    echo "ℹ️  Docker not found (optional)"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env file and add your Anthropic API key"
echo "   2. Start the system: npm start"
echo "   3. Open dashboard: http://localhost:3003"
echo "   4. Add injection script to your game's HTML"
echo ""