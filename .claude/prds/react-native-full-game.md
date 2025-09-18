---
name: React-Native-Full-Game
description: Production-ready React Native idle cultivation game with Node.js backend and networking
status: draft
created: 2025-09-17T00:00:00.000Z
updated: 2025-09-17T00:00:00.000Z
---

# PRD: React Native Idle Cultivation Game - Production Implementation

## Executive Summary

Build a production-ready idle cultivation game using React Native for cross-platform mobile deployment with a robust Node.js backend. The system will support real-time multiplayer features, persistent cloud saves, live events, and comprehensive analytics. All code will be production-grade with full test coverage using Playwright MCP validation.

## Technical Architecture Overview

### Frontend Stack
- **React Native 0.73+** with New Architecture (TurboModules + Fabric)
- **TypeScript 5.3+** with strict mode configuration
- **React Navigation 6** for navigation management
- **Redux Toolkit + RTK Query** for state management and API calls
- **React Native Reanimated 3** for 60fps animations
- **React Native Vector Icons** for iconography
- **React Native AsyncStorage** for local persistence
- **React Native Keychain** for secure token storage
- **React Native NetInfo** for network status monitoring
- **React Native Background Job** for offline cultivation
- **Socket.IO Client** for real-time features

### Backend Stack
- **Node.js 20 LTS** with Express.js framework
- **TypeScript 5.3+** throughout backend
- **PostgreSQL 16** as primary database
- **Redis 7** for caching and session management
- **Socket.IO** for real-time communication
- **JWT** for authentication with refresh tokens
- **Prisma ORM** for database management
- **Bull Queue** for background job processing
- **Winston** for structured logging
- **Helmet + CORS** for security
- **Rate limiting** with express-rate-limit
- **API versioning** with semantic versioning

### Infrastructure & DevOps
- **Docker + Docker Compose** for local development
- **Kubernetes** for production deployment
- **PostgreSQL HA** with read replicas
- **Redis Cluster** for high availability
- **NGINX** as reverse proxy and load balancer
- **Prometheus + Grafana** for monitoring
- **ELK Stack** for log aggregation
- **CI/CD Pipeline** with GitHub Actions
- **Automated testing** with Playwright MCP

## Functional Requirements

### 1. Authentication & User Management

#### Frontend Requirements
```typescript
// Authentication service interface
interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  register(userData: RegisterData): Promise<AuthResult>;
  refreshToken(): Promise<string>;
  logout(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}

// Secure token storage
interface SecureStorage {
  storeTokens(accessToken: string, refreshToken: string): Promise<void>;
  getTokens(): Promise<TokenPair | null>;
  clearTokens(): Promise<void>;
}
```

#### Backend Requirements
```typescript
// User authentication endpoints
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password

// JWT payload structure
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
```

### 2. Real-Time Cultivation System

#### Offline/Online Calculation Engine
```typescript
interface CultivationEngine {
  calculateOfflineProgress(
    lastSeen: Date,
    currentTime: Date,
    playerState: PlayerState
  ): OfflineProgress;

  processRealtimeCultivation(
    playerId: string,
    delta: number
  ): Promise<CultivationUpdate>;

  validateProgressIntegrity(
    progress: CultivationProgress
  ): ValidationResult;
}

// Real-time events via Socket.IO
interface CultivationEvents {
  'cultivation:progress': CultivationUpdate;
  'cultivation:breakthrough': BreakthroughEvent;
  'cultivation:realm-advance': RealmAdvancement;
}
```

#### Database Schema
```sql
-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  qi_cultivation BIGINT DEFAULT 0,
  body_cultivation BIGINT DEFAULT 0,
  current_realm VARCHAR(50) DEFAULT 'Mortal',
  last_cultivation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  offline_multiplier DECIMAL(10,4) DEFAULT 1.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cultivation history for analytics
CREATE TABLE cultivation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE,
  session_end TIMESTAMP WITH TIME ZONE,
  qi_gained BIGINT,
  body_gained BIGINT,
  session_type VARCHAR(20) -- 'online', 'offline'
);
```

### 3. Scripture Collection System

#### Gacha Mechanics with Server Validation
```typescript
interface GachaService {
  performPull(playerId: string, pullType: PullType): Promise<GachaResult>;
  validatePullHistory(playerId: string): Promise<boolean>;
  updatePityCounters(playerId: string, result: GachaResult): Promise<void>;
  handleDuplicateScripture(
    playerId: string,
    scripture: Scripture
  ): Promise<DuplicateReward>;
}

// Scripture rarity and rates
enum ScriptureRarity {
  COMMON = 'common',     // 70%
  UNCOMMON = 'uncommon', // 20%
  RARE = 'rare',         // 8%
  EPIC = 'epic',         // 1.8%
  LEGENDARY = 'legendary' // 0.2%
}
```

#### Database Schema
```sql
CREATE TABLE scriptures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rarity scripture_rarity NOT NULL,
  cultivation_type cultivation_type NOT NULL,
  base_multiplier DECIMAL(10,4) NOT NULL,
  max_level INTEGER DEFAULT 100,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE player_scriptures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  scripture_id UUID REFERENCES scriptures(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  experience BIGINT DEFAULT 0,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, scripture_id)
);
```

### 4. Real-Time Combat System

#### Turn-Based Combat Engine
```typescript
interface CombatEngine {
  initiateDuel(challengerId: string, defenderId: string): Promise<DuelSession>;
  processTurn(
    duelId: string,
    playerId: string,
    action: CombatAction
  ): Promise<TurnResult>;
  calculateDamage(
    attacker: CombatStats,
    defender: CombatStats,
    action: CombatAction
  ): DamageResult;
  resolveDuel(duelId: string): Promise<DuelResult>;
}

// Real-time combat events
interface CombatEvents {
  'duel:invitation': DuelInvitation;
  'duel:started': DuelSession;
  'duel:turn': TurnResult;
  'duel:finished': DuelResult;
}
```

### 5. Sect System with Guild Features

#### Collaborative Features
```typescript
interface SectService {
  createSect(founderId: string, sectData: CreateSectData): Promise<Sect>;
  joinSect(playerId: string, sectId: string): Promise<JoinResult>;
  contributeToCultivation(
    playerId: string,
    sectId: string,
    contribution: number
  ): Promise<void>;
  startSectEvent(sectId: string, eventType: SectEventType): Promise<SectEvent>;
}

// Sect-wide bonuses and events
interface SectBonus {
  type: 'cultivation_speed' | 'scripture_rates' | 'combat_power';
  multiplier: number;
  duration: number; // seconds
  requirements: SectRequirements;
}
```

## Non-Functional Requirements

### Performance Requirements

#### Frontend Performance
```typescript
// Performance monitoring configuration
interface PerformanceConfig {
  targetFPS: 60;
  maxMemoryUsage: '512MB';
  coldStartTime: '<3s';
  hotReloadTime: '<1s';
  bundleSize: {
    android: '<25MB';
    ios: '<30MB';
  };
}

// Optimization strategies
const optimizations = {
  // Bundle splitting
  codeSpitting: true,
  // Image optimization
  imageCompression: {
    quality: 0.8,
    format: 'webp',
    progressiveJPEG: true
  },
  // State management
  reduxDevtools: process.env.NODE_ENV !== 'production',
  // Navigation
  lazyScreens: true
};
```

#### Backend Performance
```typescript
// API response time requirements
interface APIPerformance {
  authentication: '<200ms';
  cultivation: '<100ms';
  gacha: '<300ms';
  combat: '<150ms';
  sectOperations: '<250ms';
  leaderboards: '<500ms';
}

// Database performance
interface DatabaseConfig {
  connectionPool: {
    min: 10,
    max: 50,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000
  };
  queryTimeout: 10000;
  indexes: {
    players: ['user_id', 'current_realm', 'last_cultivation_time'];
    scriptures: ['rarity', 'cultivation_type'];
    combat_history: ['player_id', 'created_at'];
  };
}
```

### Security Requirements

#### Authentication Security
```typescript
// JWT configuration
const jwtConfig = {
  accessToken: {
    expiresIn: '15m',
    algorithm: 'RS256'
  },
  refreshToken: {
    expiresIn: '7d',
    algorithm: 'RS256'
  },
  publicKey: process.env.JWT_PUBLIC_KEY,
  privateKey: process.env.JWT_PRIVATE_KEY
};

// Rate limiting configuration
const rateLimits = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // 5 attempts per window
  },
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
  },
  gacha: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10 // 10 pulls per minute
  }
};
```

#### Data Validation
```typescript
// Input validation schemas
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  username: z.string().min(3).max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
});

const cultivationActionSchema = z.object({
  action: z.enum(['qi', 'body', 'dual']),
  duration: z.number().min(1).max(3600), // max 1 hour
  timestamp: z.number().refine(
    (val) => Math.abs(Date.now() - val) < 5000, // 5 second tolerance
    { message: 'Timestamp too far from server time' }
  )
});
```

## Testing Strategy with Playwright MCP

### End-to-End Testing Architecture
```typescript
// Playwright test configuration
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'API Tests',
      testDir: './tests/api',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Mobile Tests',
      testDir: './tests/mobile',
      use: { ...devices['iPhone 14 Pro'] }
    }
  ]
});
```

### Comprehensive Test Suites

#### Authentication Flow Tests
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication System', () => {
  test('complete registration and login flow', async ({ page, request }) => {
    // Test registration
    const registerResponse = await request.post('/api/v1/auth/register', {
      data: {
        email: 'test@example.com',
        password: 'TestPass123!',
        username: 'testuser'
      }
    });
    expect(registerResponse.ok()).toBeTruthy();

    // Test login
    const loginResponse = await request.post('/api/v1/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'TestPass123!'
      }
    });
    expect(loginResponse.ok()).toBeTruthy();

    const tokens = await loginResponse.json();
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    // Test token refresh
    const refreshResponse = await request.post('/api/v1/auth/refresh', {
      headers: {
        'Authorization': `Bearer ${tokens.refreshToken}`
      }
    });
    expect(refreshResponse.ok()).toBeTruthy();
  });

  test('handles invalid credentials gracefully', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      }
    });
    expect(response.status()).toBe(401);

    const error = await response.json();
    expect(error.message).toBe('Invalid credentials');
  });
});
```

#### Real-Time Cultivation Tests
```typescript
// tests/e2e/cultivation.spec.ts
test.describe('Cultivation System', () => {
  test('real-time cultivation progress with WebSocket validation', async ({ page }) => {
    // Login and establish WebSocket connection
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'TestPass123!');
    await page.click('[data-testid=login-button]');

    await page.waitForURL('/cultivation');

    // Start cultivation and monitor WebSocket events
    const progressUpdates: any[] = [];
    page.on('websocket', ws => {
      ws.on('framereceived', frame => {
        const data = JSON.parse(frame.payload.toString());
        if (data.type === 'cultivation:progress') {
          progressUpdates.push(data.payload);
        }
      });
    });

    await page.click('[data-testid=start-qi-cultivation]');

    // Wait for progress updates
    await page.waitForTimeout(5000);

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[0].qiGained).toBeGreaterThan(0);

    // Verify UI reflects progress
    const qiValue = await page.textContent('[data-testid=qi-value]');
    expect(parseInt(qiValue!)).toBeGreaterThan(0);
  });

  test('offline progress calculation accuracy', async ({ request, page }) => {
    // Record starting state
    const startState = await request.get('/api/v1/player/state', {
      headers: { 'Authorization': 'Bearer token' }
    });
    const startData = await startState.json();

    // Simulate 1 hour offline
    const offlineHours = 1;
    const calculatedProgress = await request.post('/api/v1/cultivation/calculate-offline', {
      data: {
        lastSeen: new Date(Date.now() - offlineHours * 3600000).toISOString(),
        currentTime: new Date().toISOString()
      },
      headers: { 'Authorization': 'Bearer token' }
    });

    const progress = await calculatedProgress.json();

    // Validate calculation accuracy (within 1% tolerance)
    const expectedQi = startData.cultivationRate * offlineHours * 3600;
    const actualQi = progress.qiGained;
    const tolerance = expectedQi * 0.01;

    expect(Math.abs(actualQi - expectedQi)).toBeLessThan(tolerance);
  });
});
```

#### Combat System Integration Tests
```typescript
// tests/e2e/combat.spec.ts
test.describe('Combat System', () => {
  test('complete duel flow with real-time updates', async ({ browser }) => {
    // Create two browser contexts for different players
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    // Both players login
    await Promise.all([
      loginPlayer(player1Page, 'player1@test.com'),
      loginPlayer(player2Page, 'player2@test.com')
    ]);

    // Player 1 challenges Player 2
    await player1Page.click('[data-testid=find-opponent]');
    await player1Page.click('[data-testid=challenge-player2]');

    // Player 2 receives and accepts challenge
    await player2Page.waitForSelector('[data-testid=duel-invitation]');
    await player2Page.click('[data-testid=accept-duel]');

    // Both players should see duel screen
    await Promise.all([
      player1Page.waitForSelector('[data-testid=duel-arena]'),
      player2Page.waitForSelector('[data-testid=duel-arena]')
    ]);

    // Execute combat turns
    await player1Page.click('[data-testid=attack-action]');
    await player2Page.waitForSelector('[data-testid=enemy-attack-animation]');

    await player2Page.click('[data-testid=defend-action]');
    await player1Page.waitForSelector('[data-testid=enemy-defend-animation]');

    // Wait for duel completion
    await Promise.all([
      player1Page.waitForSelector('[data-testid=duel-result]'),
      player2Page.waitForSelector('[data-testid=duel-result]')
    ]);

    // Verify both players see consistent results
    const p1Result = await player1Page.textContent('[data-testid=duel-outcome]');
    const p2Result = await player2Page.textContent('[data-testid=duel-outcome]');

    expect(p1Result === 'Victory' && p2Result === 'Defeat' ||
           p1Result === 'Defeat' && p2Result === 'Victory').toBeTruthy();
  });
});
```

### Performance Testing with Playwright
```typescript
// tests/performance/load.spec.ts
test.describe('Performance Tests', () => {
  test('cultivation endpoint handles concurrent requests', async ({ request }) => {
    const concurrentRequests = 100;
    const requests = Array.from({ length: concurrentRequests }, (_, i) =>
      request.post('/api/v1/cultivation/progress', {
        data: { action: 'qi', duration: 60 },
        headers: { 'Authorization': `Bearer token${i}` }
      })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // All requests should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });

    // Average response time should be under 200ms
    const avgResponseTime = (endTime - startTime) / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(200);
  });

  test('WebSocket handles multiple simultaneous connections', async ({ browser }) => {
    const connectionCount = 50;
    const contexts = await Promise.all(
      Array.from({ length: connectionCount }, () => browser.newContext())
    );

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // All connections establish successfully
    await Promise.all(
      pages.map(page => page.goto('/cultivation'))
    );

    // Monitor WebSocket health
    const connectionHealthy = await Promise.all(
      pages.map(async page => {
        return await page.evaluate(() => {
          return new Promise(resolve => {
            const ws = (window as any).socket;
            if (ws && ws.connected) {
              resolve(true);
            } else {
              setTimeout(() => resolve(false), 5000);
            }
          });
        });
      })
    );

    expect(connectionHealthy.every(Boolean)).toBeTruthy();
  });
});
```

## Production Deployment Pipeline

### Docker Configuration
```dockerfile
# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build:android && npm run build:ios

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cultivation-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cultivation-backend
  template:
    metadata:
      labels:
        app: cultivation-backend
    spec:
      containers:
      - name: backend
        image: cultivation-game/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cultivation-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: cultivation-secrets
              key: redis-url
        - name: JWT_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: cultivation-secrets
              key: jwt-private-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test

      - name: Run integration tests
        run: npm run test:integration

      - name: Start test environment
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: sleep 30

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push backend image
        run: |
          docker build -t cultivation-backend ./backend
          docker tag cultivation-backend:latest $ECR_REGISTRY/cultivation-backend:latest
          docker push $ECR_REGISTRY/cultivation-backend:latest

      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name cultivation-cluster
          kubectl set image deployment/cultivation-backend backend=$ECR_REGISTRY/cultivation-backend:latest
          kubectl rollout status deployment/cultivation-backend
```

## Success Criteria & Validation

### Automated Quality Gates
```typescript
// Quality gate configuration
interface QualityGates {
  codeCoverage: {
    minimum: 90;
    branches: 85;
    functions: 95;
    lines: 90;
  };
  performance: {
    apiResponseTime: '<200ms';
    mobileStartupTime: '<3s';
    memoryUsage: '<512MB';
    batteryDrain: '<5%/hour';
  };
  security: {
    vulnerabilities: 0;
    securityScoreMinimum: 8.5;
    penetrationTestPass: true;
  };
  reliability: {
    uptime: 99.9;
    errorRate: '<0.1%';
    crashFreeUsers: '>99.5%';
  };
}
```

### Monitoring & Observability
```typescript
// Monitoring configuration
const monitoringConfig = {
  metrics: {
    business: [
      'daily_active_users',
      'cultivation_sessions_per_user',
      'gacha_conversion_rate',
      'sect_participation_rate'
    ],
    technical: [
      'api_response_times',
      'database_query_performance',
      'websocket_connection_count',
      'memory_usage_per_service'
    ],
    alerts: [
      {
        metric: 'api_error_rate',
        threshold: '1%',
        duration: '5m',
        severity: 'critical'
      },
      {
        metric: 'active_websocket_connections',
        threshold: '< 1000',
        duration: '2m',
        severity: 'warning'
      }
    ]
  },
  logging: {
    level: 'info',
    structured: true,
    retention: '30d',
    sensitiveDataFiltering: true
  }
};
```

This production-ready specification provides comprehensive technical details for building a React Native idle cultivation game with robust networking, real-time features, and enterprise-grade testing with Playwright MCP validation. Every component is designed for production deployment with proper monitoring, security, and scalability considerations.