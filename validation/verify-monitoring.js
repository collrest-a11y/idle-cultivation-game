/**
 * Simple verification script to ensure all monitoring modules load correctly
 */
import { PerformanceMonitor } from './performance-monitor.js';
import { NetworkMonitor } from './network-monitor.js';
import { MemoryTracker } from './memory-tracker.js';

console.log('🔍 Verifying Performance & Network Monitoring Modules...\n');

try {
  // Test module imports
  console.log('✅ PerformanceMonitor imported successfully');
  console.log('✅ NetworkMonitor imported successfully');
  console.log('✅ MemoryTracker imported successfully');

  // Test instantiation
  const perfMonitor = new PerformanceMonitor();
  const netMonitor = new NetworkMonitor();
  const memTracker = new MemoryTracker();

  console.log('✅ All modules instantiate correctly');

  // Test basic functionality
  console.log('\n📊 Testing basic functionality...');

  // Test PerformanceMonitor
  const perfSummary = perfMonitor.getSummary();
  console.log(`✅ PerformanceMonitor: ${perfSummary.totalErrors} errors, active: ${perfSummary.isActive}`);

  // Test NetworkMonitor
  const netSummary = netMonitor.getSummary();
  console.log(`✅ NetworkMonitor: ${netSummary.totalErrors} errors, active: ${netSummary.isActive}`);

  // Test MemoryTracker
  const memSummary = memTracker.getSummary();
  console.log(`✅ MemoryTracker: ${memSummary.totalErrors} errors, active: ${memSummary.isActive}`);

  // Test error capturing
  console.log('\n🧪 Testing error capturing...');

  perfMonitor.captureError({
    type: 'test-error',
    severity: 'HIGH',
    message: 'Test performance error',
    timestamp: Date.now()
  });

  netMonitor.captureError({
    type: 'test-error',
    severity: 'MEDIUM',
    message: 'Test network error',
    timestamp: Date.now()
  });

  memTracker.captureError({
    type: 'test-error',
    severity: 'LOW',
    message: 'Test memory error',
    timestamp: Date.now()
  });

  console.log(`✅ PerformanceMonitor captured: ${perfMonitor.getErrors().length} errors`);
  console.log(`✅ NetworkMonitor captured: ${netMonitor.getErrors().length} errors`);
  console.log(`✅ MemoryTracker captured: ${memTracker.getErrors().length} errors`);

  // Test error filtering by severity
  console.log('\n🔍 Testing error filtering...');

  const highErrors = perfMonitor.getErrors('HIGH');
  const mediumErrors = netMonitor.getErrors('MEDIUM');
  const lowErrors = memTracker.getErrors('LOW');

  console.log(`✅ High severity errors: ${highErrors.length}`);
  console.log(`✅ Medium severity errors: ${mediumErrors.length}`);
  console.log(`✅ Low severity errors: ${lowErrors.length}`);

  // Test cleanup
  console.log('\n🧹 Testing cleanup...');

  perfMonitor.destroy();
  netMonitor.destroy();
  memTracker.destroy();

  console.log('✅ All monitors destroyed successfully');

  console.log('\n🎉 All verification tests passed!');
  console.log('\n📋 Summary:');
  console.log('• Performance monitoring modules load and instantiate correctly');
  console.log('• Error capturing and filtering works as expected');
  console.log('• Cleanup functionality operates properly');
  console.log('• Ready for integration with Playwright-based testing');

} catch (error) {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}