/**
 * Global setup for Playwright E2E tests
 * Prepares test environment and validates game systems
 */

const fs = require('fs');
const path = require('path');

async function globalSetup() {
  console.log('🔧 Setting up E2E test environment...');

  // Validate game files exist
  const requiredFiles = [
    'game.js',
    'index.html',
    'js/core/GameState.js',
    'js/core/EventManager.js',
    'js/systems/PowerCalculator.js'
  ];

  const missingFiles = [];
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Missing required game files: ${missingFiles.join(', ')}`);
  }

  // Create test data directory
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Generate test save data
  const testSaveData = {
    player: {
      name: 'E2E_Test_Player',
      cultivation: {
        qi: { level: 25, experience: 10000 },
        body: { level: 20, experience: 8000 },
        realm: 'Foundation Establishment',
        stage: 2
      },
      resources: {
        jade: 50000,
        spiritStones: 2500
      },
      progressionSystems: {
        mounts: { unlocked: true, active: 'Spirit Horse', level: 10 },
        wings: { unlocked: true, active: 'Feather Wings', level: 8 },
        accessories: { unlocked: true },
        runes: { unlocked: true },
        meridians: { unlocked: true },
        dantian: { unlocked: true },
        soul: { unlocked: false }
      },
      settings: {
        autoSave: true,
        notifications: true,
        theme: 'gfl-dark'
      }
    },
    gameState: {
      version: '1.0.0',
      lastSave: Date.now(),
      playtime: 3600000 // 1 hour
    }
  };

  fs.writeFileSync(
    path.join(testDataDir, 'test-save.json'),
    JSON.stringify(testSaveData, null, 2)
  );

  console.log('✅ E2E test environment setup complete');
}

module.exports = globalSetup;