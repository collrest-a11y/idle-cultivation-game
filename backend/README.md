# Idle Cultivation Game Backend

TypeScript/Express.js backend server for the idle cultivation game.

## Features

- **Express.js 4.18+** with TypeScript configuration
- **Environment-based configuration** (development/staging/production)
- **Security middleware** (Helmet, CORS, Rate limiting)
- **Comprehensive logging** with Winston
- **Health check endpoints** for monitoring
- **Graceful shutdown** handling
- **TypeScript** with strict configuration

## Getting Started

### Prerequisites

- Node.js 20 LTS or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Modify `.env` file with your configuration

### Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot reload enabled.

### Production

Build and start the production server:
```bash
npm run build
npm start
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run build:watch` - Build in watch mode
- `npm start` - Start production server
- `npm run clean` - Clean build directory
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix

## API Endpoints

### Health Check
- `GET /health` - Server health status and metrics

### API Info
- `GET /api/v1` - API version and available endpoints

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `NODE_ENV` - Environment (development/staging/production)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `CORS_ORIGIN` - Allowed CORS origins
- `LOG_LEVEL` - Logging level (error/warn/info/debug)

## Architecture

```
src/
├── config/           # Configuration and environment management
│   ├── environment.ts
│   ├── logger.ts
│   └── index.ts
├── app.ts           # Express application setup
└── server.ts        # HTTP server and bootstrapping
```

## Game-Specific Configuration

- `TICK_RATE_MS` - Game loop tick rate (default: 1000ms)
- `MAX_IDLE_TIME_HOURS` - Maximum idle progression time (default: 72 hours)

## Logging

The application uses Winston for structured logging with different formats for development and production:

- **Development**: Simple console logging
- **Production**: JSON format with file outputs

## Security

- **Helmet**: Security headers
- **CORS**: Cross-origin request handling
- **Rate Limiting**: Request throttling
- **Input Validation**: Request body validation
- **Error Handling**: Sanitized error responses