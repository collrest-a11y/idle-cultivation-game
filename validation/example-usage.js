import { ValidationPipeline } from './validation-pipeline.js';
import { FixValidator } from './fix-validator.js';
import { RollbackManager } from './rollback-manager.js';

/**
 * Example Usage - Fix Validation & Application System
 *
 * This file demonstrates how to use the validation system components
 * in various scenarios and configurations.
 */

// Example 1: Basic Fix Validation
async function basicFixValidationExample() {
  console.log('\n🔧 Example 1: Basic Fix Validation');

  const validator = new FixValidator();

  const fix = {
    type: 'content-replacement',
    search: 'if \\(selectedChoices\\.length === 3\\)',
    replace: 'if (selectedChoices.length >= 3)',
    description: 'Fix character creation button enabling logic'
  };

  const error = {
    type: 'character-creation-bug',
    message: 'Begin button not enabled after all choices selected',
    component: 'character-creation'
  };

  const context = {
    file: 'src/character-creation.js',
    line: null
  };

  try {
    const results = await validator.validateFix(fix, error, context);

    console.log(`Validation Score: ${results.score}/100`);
    console.log(`Recommendation: ${results.recommendation.action}`);
    console.log(`Confidence: ${results.recommendation.confidence}`);

    if (results.score >= 90) {
      console.log('✅ Fix is ready for deployment!');
    } else {
      console.log('⚠️ Fix needs improvement before deployment');
    }
  } catch (error) {
    console.error('Validation failed:', error.message);
  }
}

// Example 2: Complete Pipeline with Auto-Apply
async function completePipelineExample() {
  console.log('\n🏗️ Example 2: Complete Pipeline with Auto-Apply');

  const pipeline = new ValidationPipeline({
    // Configuration options
    confidenceThreshold: 85,      // Require 85+ score for auto-apply
    autoApply: true,              // Automatically apply high-confidence fixes
    createReports: true,          // Generate validation reports
    performRollbackOnFailure: true, // Auto-rollback if issues detected

    // Component-specific options
    fixValidator: {
      sandboxDir: './validation-sandbox',
      serverPort: 8080
    },
    rollbackManager: {
      checkpointsDir: './validation-checkpoints',
      maxCheckpoints: 15,
      gameDir: './'
    },
    performanceValidator: {
      maxLoadTime: 3000,
      minFPS: 45,
      maxMemoryMB: 200,
      samples: 3
    },
    reporter: {
      outputDir: './validation-reports',
      includeCharts: true
    }
  });

  const syntaxFix = {
    type: 'line-insertion',
    code: '    return result;',
    description: 'Add missing return statement'
  };

  const syntaxError = {
    type: 'syntax-error',
    message: 'Function missing return statement',
    file: 'src/utils.js',
    line: 45
  };

  const context = {
    file: 'src/utils.js',
    line: 45
  };

  try {
    console.log('Starting validation pipeline...');
    const result = await pipeline.runPipeline(syntaxFix, syntaxError, context);

    console.log(`Pipeline Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Stages Completed: ${result.stagesCompleted.length}`);
    console.log(`Fix Applied: ${result.applied ? 'YES' : 'NO'}`);

    if (result.applied) {
      console.log(`✅ Fix automatically applied and validated!`);
      console.log(`Checkpoint created: ${result.checkpointId}`);
    } else {
      console.log('⏸️ Fix requires manual review before application');
    }

    if (result.reportGenerated) {
      console.log(`📊 Report generated at: ${result.validationResults?.reportDir}`);
    }

  } catch (error) {
    console.error('Pipeline execution failed:', error.message);
  }
}

// Example 3: Manual Rollback Management
async function rollbackManagementExample() {
  console.log('\n⏪ Example 3: Manual Rollback Management');

  const rollbackManager = new RollbackManager({
    checkpointsDir: './my-checkpoints',
    maxCheckpoints: 20
  });

  await rollbackManager.initialize();

  try {
    // Create a checkpoint before making changes
    console.log('Creating checkpoint...');
    const checkpointId = await rollbackManager.createCheckpoint(
      'Before implementing new feature',
      {
        feature: 'advanced-cultivation',
        developer: 'john.doe',
        jiraTicket: 'CULT-123'
      }
    );

    console.log(`✅ Checkpoint created: ${checkpointId}`);

    // Simulate making changes...
    console.log('Making code changes...');

    // Later, if something goes wrong, rollback
    console.log('Rolling back changes...');
    const rollbackResult = await rollbackManager.rollbackTo(checkpointId);

    if (rollbackResult.success) {
      console.log('✅ Rollback completed successfully!');
      console.log(`Files restored: ${rollbackResult.rollbackResult.filesRestored}`);
      console.log(`Files deleted: ${rollbackResult.rollbackResult.filesDeleted}`);
    } else {
      console.error('❌ Rollback failed');
    }

    // List all available checkpoints
    console.log('\nAvailable checkpoints:');
    const checkpoints = rollbackManager.listCheckpoints();
    checkpoints.forEach(checkpoint => {
      console.log(`- ${checkpoint.id}: ${checkpoint.description} (${checkpoint.size})`);
    });

  } catch (error) {
    console.error('Rollback management failed:', error.message);
  }
}

// Example 4: Performance Validation Only
async function performanceValidationExample() {
  console.log('\n⚡ Example 4: Performance Validation Only');

  // Create a mock sandbox for demonstration
  const mockSandbox = {
    id: 'performance-test',
    path: './performance-test-sandbox',
    cleanup: async () => console.log('Sandbox cleaned up')
  };

  const performanceValidator = new PerformanceValidator({
    // Stricter performance requirements
    maxLoadTime: 2000,        // 2 seconds max load time
    minFPS: 50,              // Minimum 50 FPS
    maxMemoryMB: 100,        // Max 100MB memory usage
    maxCPUTime: 500,         // Max 500ms CPU time for long tasks
    samples: 5,              // Take 5 samples for accuracy
    measurementTime: 10000   // Measure for 10 seconds
  });

  try {
    console.log('Running performance validation...');

    // In a real scenario, this would test against a sandbox
    // For this example, we'll demonstrate the baseline comparison feature
    const baseline = {
      load: { averageLoadTime: 1800 },
      runtime: { averageFPS: 55, averageMemoryMB: 85 },
      memory: { peakMemoryMB: 95 },
      overall: { average: 88 }
    };

    // Simulate performance validation results
    const results = {
      samples: 5,
      aggregate: {
        load: { averageLoadTime: 2100, passed: false }, // Slower than baseline
        runtime: { averageFPS: 52, averageMemoryMB: 90 },
        memory: { peakMemoryMB: 98, passed: true },
        overall: { average: 85 }
      },
      comparison: performanceValidator.compareWithBaseline(
        { load: { averageLoadTime: 2100 }, runtime: { averageFPS: 52 } },
        baseline
      ),
      passed: false,
      issues: [
        {
          type: 'slow-load-time',
          severity: 'HIGH',
          message: 'Load time 2100ms exceeds threshold 2000ms'
        }
      ],
      recommendations: [
        'Consider optimizing assets and reducing bundle size',
        'Implement lazy loading for non-critical resources'
      ]
    };

    console.log(`Performance Score: ${results.aggregate.overall.average}/100`);
    console.log(`Load Time: ${results.aggregate.load.averageLoadTime}ms`);
    console.log(`FPS: ${results.aggregate.runtime.averageFPS}`);
    console.log(`Memory: ${results.aggregate.runtime.averageMemoryMB}MB`);

    if (results.comparison) {
      console.log('\nComparison with baseline:');
      console.log(`Load Time Change: ${results.comparison.loadTimeChange?.toFixed(1)}%`);
      console.log(`FPS Change: ${results.comparison.fpsChange?.toFixed(1)}%`);
    }

    if (results.issues.length > 0) {
      console.log('\n⚠️ Performance Issues:');
      results.issues.forEach(issue => {
        console.log(`  ${issue.severity}: ${issue.message}`);
      });
    }

    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }

  } catch (error) {
    console.error('Performance validation failed:', error.message);
  }
}

// Example 5: Custom Validation Workflow
async function customValidationWorkflowExample() {
  console.log('\n🔄 Example 5: Custom Validation Workflow');

  const pipeline = new ValidationPipeline({
    confidenceThreshold: 75,
    autoApply: false,  // Manual approval required
    createReports: true
  });

  // Multiple fixes to validate
  const fixes = [
    {
      fix: {
        type: 'content-replacement',
        search: 'Math\\.floor\\(Math\\.random\\(\\) \\* 100\\)',
        replace: 'this.randomGenerator.nextInt(100)',
        description: 'Replace Math.random with seeded random generator'
      },
      error: {
        type: 'determinism-issue',
        message: 'Game calculations not deterministic for testing'
      },
      context: { file: 'src/game-logic.js' }
    },
    {
      fix: {
        type: 'line-insertion',
        code: '  this.validateState();',
        description: 'Add state validation to save function'
      },
      error: {
        type: 'data-corruption',
        message: 'Save data occasionally corrupted'
      },
      context: { file: 'src/save-manager.js', line: 156 }
    }
  ];

  console.log(`Validating ${fixes.length} fixes...`);

  const results = [];

  for (const [index, fixData] of fixes.entries()) {
    console.log(`\nValidating fix ${index + 1}/${fixes.length}: ${fixData.fix.description}`);

    try {
      const result = await pipeline.runPipeline(
        fixData.fix,
        fixData.error,
        fixData.context
      );

      results.push({
        fix: fixData.fix.description,
        score: result.validationResults?.score || 0,
        recommendation: result.validationResults?.recommendation?.action || 'UNKNOWN',
        success: result.success
      });

      console.log(`  Score: ${result.validationResults?.score || 0}/100`);
      console.log(`  Recommendation: ${result.validationResults?.recommendation?.action || 'UNKNOWN'}`);

    } catch (error) {
      console.error(`  Failed: ${error.message}`);
      results.push({
        fix: fixData.fix.description,
        score: 0,
        recommendation: 'FAILED',
        success: false
      });
    }
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  console.log('='.repeat(50));

  results.forEach((result, index) => {
    const status = result.success ?
      (result.recommendation === 'APPLY' ? '✅ READY' : '⚠️ REVIEW') :
      '❌ FAILED';

    console.log(`${index + 1}. ${result.fix}`);
    console.log(`   Score: ${result.score}/100 | ${status}`);
  });

  const readyToApply = results.filter(r => r.recommendation === 'APPLY').length;
  const needReview = results.filter(r => r.recommendation === 'MANUAL_REVIEW' || r.recommendation === 'APPLY_WITH_MONITORING').length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n📈 Statistics:');
  console.log(`Ready to Apply: ${readyToApply}`);
  console.log(`Need Review: ${needReview}`);
  console.log(`Failed: ${failed}`);
}

// Example 6: Error Handling and Recovery
async function errorHandlingExample() {
  console.log('\n🛡️ Example 6: Error Handling and Recovery');

  const pipeline = new ValidationPipeline({
    maxRetries: 3,
    performRollbackOnFailure: true
  });

  // Test with a problematic fix
  const problematicFix = {
    type: 'content-replacement',
    search: 'nonexistent-pattern-that-will-never-match',
    replace: 'replacement-content',
    description: 'This fix will fail to apply'
  };

  const error = {
    type: 'test-error',
    message: 'Test error for error handling'
  };

  const context = {
    file: 'nonexistent-file.js'  // This will cause validation to fail
  };

  try {
    console.log('Attempting to validate problematic fix...');
    const result = await pipeline.runPipeline(problematicFix, error, context);

    // This should not succeed
    if (result.success) {
      console.log('⚠️ Unexpected: Problematic fix succeeded');
    } else {
      console.log('✅ Expected: Pipeline correctly handled problematic fix');
      console.log(`Error: ${result.error}`);
      console.log(`Rollback performed: ${result.rolledBack}`);
    }

  } catch (pipelineError) {
    console.log('✅ Expected: Pipeline threw error for invalid fix');
    console.log(`Error handled: ${pipelineError.message}`);
  }

  // Test rollback functionality
  console.log('\nTesting rollback functionality...');

  const rollbackManager = new RollbackManager();
  await rollbackManager.initialize();

  try {
    // This should fail gracefully
    await rollbackManager.rollbackTo('nonexistent-checkpoint');
  } catch (rollbackError) {
    console.log('✅ Expected: Rollback correctly handled nonexistent checkpoint');
    console.log(`Error: ${rollbackError.message}`);
  }
}

// Main example runner
async function runAllExamples() {
  console.log('🚀 Fix Validation System - Example Usage Demonstrations');
  console.log('='.repeat(60));

  const examples = [
    { name: 'Basic Fix Validation', fn: basicFixValidationExample },
    { name: 'Complete Pipeline with Auto-Apply', fn: completePipelineExample },
    { name: 'Manual Rollback Management', fn: rollbackManagementExample },
    { name: 'Performance Validation Only', fn: performanceValidationExample },
    { name: 'Custom Validation Workflow', fn: customValidationWorkflowExample },
    { name: 'Error Handling and Recovery', fn: errorHandlingExample }
  ];

  for (const example of examples) {
    try {
      await example.fn();
    } catch (error) {
      console.error(`\n❌ Example "${example.name}" failed:`, error.message);
    }

    // Add separator between examples
    console.log('\n' + '-'.repeat(60));
  }

  console.log('\n✅ All examples completed!');
  console.log('\n📚 For more information, see:');
  console.log('  - Task specification: .claude/epics/iterate-validate-fix-loop/tasks/005-fix-validation.md');
  console.log('  - Integration tests: validation/test-validation-system.js');
  console.log('  - Component documentation: validation/README.md (updated)');
}

// Export examples for individual use
export {
  basicFixValidationExample,
  completePipelineExample,
  rollbackManagementExample,
  performanceValidationExample,
  customValidationWorkflowExample,
  errorHandlingExample,
  runAllExamples
};

// Run all examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(error => {
    console.error('Example runner failed:', error);
    process.exit(1);
  });
}