/**
 * Global teardown for Playwright E2E tests
 * Cleans up test environment
 */

const fs = require('fs');
const path = require('path');

async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up test data
  const testDataDir = path.join(__dirname, 'test-data');
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }

  // Clean up any test localStorage data
  // This would be handled by the browser cleanup in actual tests

  console.log('✅ E2E test environment cleanup complete');
}

module.exports = globalTeardown;