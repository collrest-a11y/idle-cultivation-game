---
name: Iterative Loop Controller Implementation
status: open
created: 2025-09-25T19:40:00Z
updated: 2025-09-25T20:15:00Z
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/127
priority: P1
effort: 1d
dependencies: [001, 002, 003, 004, 005]
---

# Task 006: Iterative Loop Controller Implementation

## Objective
Build the main orchestration system that continuously runs validation, identifies errors, generates fixes, and applies them until the codebase is error-free.

## Background
The loop controller is the brain of the system, coordinating all components to achieve 100% error-free code through iterative improvement.

## Acceptance Criteria

### Required
- [ ] Main orchestration logic implemented
- [ ] Error prioritization system
- [ ] Convergence detection (no more errors)
- [ ] Loop safety mechanisms (max iterations)
- [ ] Progress tracking and reporting
- [ ] Parallel fix processing support
- [ ] State management between iterations
- [ ] Interrupt/resume capability
- [ ] Fix conflict resolution
- [ ] Success criteria validation

### Nice to Have
- [ ] Machine learning for fix prioritization
- [ ] Predictive convergence estimation
- [ ] Resource usage optimization
- [ ] Distributed processing support

## Technical Implementation

### 1. Main Loop Controller
```javascript
// loop-controller/orchestrator.js
import { ErrorDetector } from '../validation/error-detector';
import { MCPFixGenerator } from '../fix-generation/mcp-client';
import { ValidationPipeline } from '../validation/validation-pipeline';
import { Reporter } from '../reporting/reporter';

export class LoopOrchestrator {
  constructor(config = {}) {
    this.config = {
      maxIterations: config.maxIterations || 10,
      convergenceThreshold: config.convergenceThreshold || 0,
      parallelFixes: config.parallelFixes || 3,
      confidenceThreshold: config.confidenceThreshold || 70,
      ...config
    };
    
    this.state = {
      iteration: 0,
      totalErrors: 0,
      fixedErrors: 0,
      failedFixes: 0,
      startTime: null,
      status: 'idle'
    };
    
    this.errorDetector = new ErrorDetector();
    this.fixGenerator = new MCPFixGenerator(config.apiKey);
    this.validationPipeline = new ValidationPipeline();
    this.reporter = new Reporter();
    
    this.errorHistory = [];
    this.fixHistory = [];
  }

  async run() {
    console.log('🚀 Starting Validation & Fix Loop');
    this.state.startTime = Date.now();
    this.state.status = 'running';
    
    try {
      while (this.shouldContinue()) {
        this.state.iteration++;
        console.log(`\n📍 Iteration ${this.state.iteration}`);
        
        // Step 1: Run comprehensive validation
        const errors = await this.detectErrors();
        console.log(`  Found ${errors.length} errors`);
        
        if (errors.length === 0) {
          console.log('✅ No errors detected! System is clean.');
          this.state.status = 'success';
          break;
        }
        
        // Step 2: Prioritize errors
        const prioritizedErrors = this.prioritizeErrors(errors);
        
        // Step 3: Generate and apply fixes
        const fixResults = await this.processErrors(prioritizedErrors);
        
        // Step 4: Update state and report progress
        this.updateState(fixResults);
        await this.reportProgress();
        
        // Step 5: Check for convergence
        if (this.hasConverged()) {
          console.log('📊 System has converged');
          break;
        }
      }
    } catch (error) {
      console.error('❌ Loop failed:', error);
      this.state.status = 'error';
      throw error;
    } finally {
      await this.cleanup();
      await this.generateFinalReport();
    }
    
    return this.state;
  }

  shouldContinue() {
    return (
      this.state.status === 'running' &&
      this.state.iteration < this.config.maxIterations
    );
  }

  async detectErrors() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto('http://localhost:8080');
      await this.errorDetector.initialize(page);
      
      // Run comprehensive test suite
      await this.runTestSuite(page);
      
      // Wait for error collection
      await page.waitForTimeout(5000);
      
      // Get all detected errors
      const errors = this.errorDetector.getErrors();
      
      // Add functional error detection
      const functionalErrors = await this.detectFunctionalErrors(page);
      errors.push(...functionalErrors);
      
      // Deduplicate errors
      return this.deduplicateErrors(errors);
    } finally {
      this.errorDetector.destroy();
      await browser.close();
    }
  }

  prioritizeErrors(errors) {
    // Sort by severity and impact
    const priorityMap = {
      'CRITICAL': 1,
      'HIGH': 2,
      'MEDIUM': 3,
      'LOW': 4
    };
    
    return errors.sort((a, b) => {
      // First by severity
      const severityDiff = priorityMap[a.severity] - priorityMap[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by frequency (if tracked)
      const freqDiff = (b.frequency || 1) - (a.frequency || 1);
      if (freqDiff !== 0) return freqDiff;
      
      // Then by component criticality
      const criticalComponents = ['character-creation', 'save-system', 'game-init'];
      const aCritical = criticalComponents.includes(a.component);
      const bCritical = criticalComponents.includes(b.component);
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      
      return 0;
    });
  }

  async processErrors(errors) {
    const results = {
      fixed: [],
      failed: [],
      skipped: []
    };
    
    // Process in batches for parallel fixing
    const batches = this.createBatches(errors, this.config.parallelFixes);
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(error => this.processError(error))
      );
      
      batchResults.forEach((result, index) => {
        const error = batch[index];
        if (result.success) {
          results.fixed.push({ error, fix: result.fix });
        } else if (result.skipped) {
          results.skipped.push({ error, reason: result.reason });
        } else {
          results.failed.push({ error, reason: result.reason });
        }
      });
      
      // Check for conflicts after each batch
      await this.resolveConflicts(results.fixed);
    }
    
    return results;
  }

  async processError(error) {
    console.log(`  Processing: ${error.type} (${error.severity})`);
    
    // Check if we've tried this error too many times
    const attempts = this.getErrorAttempts(error);
    if (attempts >= 3) {
      console.log(`    Skipping: Max attempts reached`);
      return { skipped: true, reason: 'max-attempts' };
    }
    
    try {
      // Generate fix
      const context = await this.gatherContext(error);
      const fix = await this.fixGenerator.generateFix(error, context);
      
      // Check confidence
      if (fix.confidence < this.config.confidenceThreshold) {
        console.log(`    Skipping: Low confidence (${fix.confidence}%)`);
        return { skipped: true, reason: 'low-confidence' };
      }
      
      // Validate and apply fix
      const validationResult = await this.validationPipeline.runPipeline(
        fix, error, context
      );
      
      if (validationResult.success) {
        console.log(`    ✅ Fixed successfully`);
        this.recordFix(error, fix, true);
        return { success: true, fix };
      } else {
        console.log(`    ❌ Fix failed: ${validationResult.reason}`);
        this.recordFix(error, fix, false);
        return { success: false, reason: validationResult.reason };
      }
    } catch (err) {
      console.error(`    ❌ Error processing: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }

  async gatherContext(error) {
    // Gather relevant context for fix generation
    const context = {
      file: error.location?.file || 'unknown',
      line: error.location?.line,
      functionName: error.location?.function,
      relevantCode: '',
      userAction: error.context?.userAction,
      expectedBehavior: error.context?.expectedBehavior,
      component: error.component
    };
    
    // Try to get relevant code snippet
    if (context.file !== 'unknown') {
      try {
        const fileContent = await fs.readFile(context.file, 'utf-8');
        const lines = fileContent.split('\n');
        
        if (context.line) {
          const start = Math.max(0, context.line - 5);
          const end = Math.min(lines.length, context.line + 5);
          context.relevantCode = lines.slice(start, end).join('\n');
        }
      } catch (err) {
        // Ignore file read errors
      }
    }
    
    return context;
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async resolveConflicts(fixes) {
    // Check if multiple fixes affect the same file/function
    const fileMap = {};
    
    for (const { error, fix } of fixes) {
      const file = error.location?.file || 'unknown';
      if (!fileMap[file]) {
        fileMap[file] = [];
      }
      fileMap[file].push({ error, fix });
    }
    
    // Resolve conflicts for files with multiple fixes
    for (const [file, fileFixes] of Object.entries(fileMap)) {
      if (fileFixes.length > 1) {
        console.log(`  ⚠️ Resolving ${fileFixes.length} conflicts in ${file}`);
        await this.mergeFixesForFile(file, fileFixes);
      }
    }
  }

  async mergeFixesForFile(file, fixes) {
    // Simple conflict resolution: apply fixes in order of line number
    fixes.sort((a, b) => {
      const lineA = a.error.location?.line || Infinity;
      const lineB = b.error.location?.line || Infinity;
      return lineA - lineB;
    });
    
    // Apply fixes sequentially with offset tracking
    let lineOffset = 0;
    for (const { error, fix } of fixes) {
      if (error.location?.line) {
        error.location.line += lineOffset;
        // Track how many lines the fix adds
        lineOffset += (fix.code.split('\n').length - 1);
      }
    }
  }

  hasConverged() {
    // Check if we're making progress
    if (this.errorHistory.length < 2) {
      return false;
    }
    
    const currentErrors = this.errorHistory[this.errorHistory.length - 1];
    const previousErrors = this.errorHistory[this.errorHistory.length - 2];
    
    // No improvement
    if (currentErrors >= previousErrors) {
      console.log('  ⚠️ No improvement detected');
      return true;
    }
    
    // Reached threshold
    if (currentErrors <= this.config.convergenceThreshold) {
      return true;
    }
    
    return false;
  }

  updateState(fixResults) {
    this.state.totalErrors += (fixResults.fixed.length + 
                               fixResults.failed.length + 
                               fixResults.skipped.length);
    this.state.fixedErrors += fixResults.fixed.length;
    this.state.failedFixes += fixResults.failed.length;
    
    // Track error count history
    const remainingErrors = this.state.totalErrors - this.state.fixedErrors;
    this.errorHistory.push(remainingErrors);
  }

  async reportProgress() {
    const elapsed = Date.now() - this.state.startTime;
    const avgFixTime = elapsed / Math.max(1, this.state.fixedErrors);
    
    console.log(`\n📊 Progress Report:`);
    console.log(`  Iteration: ${this.state.iteration}/${this.config.maxIterations}`);
    console.log(`  Errors Fixed: ${this.state.fixedErrors}/${this.state.totalErrors}`);
    console.log(`  Success Rate: ${(this.state.fixedErrors / Math.max(1, this.state.totalErrors) * 100).toFixed(1)}%`);
    console.log(`  Avg Fix Time: ${(avgFixTime / 1000).toFixed(1)}s`);
    console.log(`  Elapsed Time: ${(elapsed / 1000 / 60).toFixed(1)} minutes`);
  }

  getErrorAttempts(error) {
    return this.fixHistory.filter(h => 
      h.error.type === error.type && 
      h.error.message === error.message
    ).length;
  }

  recordFix(error, fix, success) {
    this.fixHistory.push({
      error: { type: error.type, message: error.message },
      fix: { confidence: fix.confidence },
      success,
      iteration: this.state.iteration,
      timestamp: Date.now()
    });
  }

  async cleanup() {
    // Clean up resources
    this.errorDetector.destroy();
    // Save state for resume capability
    await this.saveState();
  }

  async saveState() {
    const stateFile = '.validation-state.json';
    await fs.writeJson(stateFile, {
      state: this.state,
      errorHistory: this.errorHistory,
      fixHistory: this.fixHistory,
      timestamp: Date.now()
    }, { spaces: 2 });
  }

  async resume() {
    const stateFile = '.validation-state.json';
    if (await fs.pathExists(stateFile)) {
      const saved = await fs.readJson(stateFile);
      this.state = saved.state;
      this.errorHistory = saved.errorHistory;
      this.fixHistory = saved.fixHistory;
      console.log(`📂 Resumed from iteration ${this.state.iteration}`);
      return true;
    }
    return false;
  }

  async generateFinalReport() {
    const report = {
      summary: {
        status: this.state.status,
        iterations: this.state.iteration,
        totalErrors: this.state.totalErrors,
        fixedErrors: this.state.fixedErrors,
        failedFixes: this.state.failedFixes,
        successRate: (this.state.fixedErrors / Math.max(1, this.state.totalErrors) * 100).toFixed(1) + '%',
        duration: ((Date.now() - this.state.startTime) / 1000 / 60).toFixed(1) + ' minutes'
      },
      errorHistory: this.errorHistory,
      fixHistory: this.fixHistory,
      recommendations: this.generateRecommendations()
    };
    
    await this.reporter.generateReport(report);
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL REPORT');
    console.log('='.repeat(60));
    console.log(`Status: ${report.summary.status}`);
    console.log(`Errors Fixed: ${report.summary.fixedErrors}/${report.summary.totalErrors}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Duration: ${report.summary.duration}`);
    console.log('='.repeat(60));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.state.failedFixes > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: `${this.state.failedFixes} fixes failed. Manual review recommended.`
      });
    }
    
    if (this.state.status === 'success') {
      recommendations.push({
        priority: 'INFO',
        message: 'All errors fixed successfully. Run full test suite before deployment.'
      });
    }
    
    if (this.state.iteration >= this.config.maxIterations) {
      recommendations.push({
        priority: 'WARNING',
        message: 'Max iterations reached. Some errors may remain.'
      });
    }
    
    return recommendations;
  }
}
```

### 2. CLI Interface
```javascript
// loop-controller/cli.js
#!/usr/bin/env node

import { LoopOrchestrator } from './orchestrator';
import { program } from 'commander';

program
  .name('validate-fix')
  .description('Automated validation and fix loop for 100% error-free code')
  .version('1.0.0');

program
  .command('run')
  .description('Run the validation and fix loop')
  .option('-m, --max-iterations <n>', 'Maximum iterations', '10')
  .option('-c, --confidence <n>', 'Minimum fix confidence', '70')
  .option('-p, --parallel <n>', 'Parallel fixes', '3')
  .option('--api-key <key>', 'MCP API key')
  .option('--resume', 'Resume from previous state')
  .action(async (options) => {
    const orchestrator = new LoopOrchestrator({
      maxIterations: parseInt(options.maxIterations),
      confidenceThreshold: parseInt(options.confidence),
      parallelFixes: parseInt(options.parallel),
      apiKey: options.apiKey || process.env.MCP_API_KEY
    });
    
    if (options.resume) {
      await orchestrator.resume();
    }
    
    try {
      const result = await orchestrator.run();
      process.exit(result.status === 'success' ? 0 : 1);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  });

program.parse();
```

## Success Metrics
- Achieves 100% error-free state within 10 iterations
- Correctly prioritizes critical errors (character creation)
- No infinite loops or stuck states
- Can resume from interruption
- Parallel processing improves speed by 2x+
- Convergence detection accuracy > 95%

## Notes
- Monitor resource usage during execution
- Implement graceful shutdown on SIGINT
- Save progress regularly for resume capability
- Consider implementing a web UI for monitoring