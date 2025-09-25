---
name: Automated Validation & Fix Loop System
status: in-progress
created: 2025-09-25T19:30:00Z
updated: 2025-09-25T20:15:00Z
progress: 12%
prd: .claude/prds/iterate-validate-fix-loop-until-no-errors-100-percent-through-full-production-code-validation-playwright-mcp.md
github: https://github.com/collrest-a11y/idle-cultivation-game
issues:
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/122
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/123
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/124
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/125
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/126
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/127
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/128
  - https://github.com/collrest-a11y/idle-cultivation-game/issues/129
---

# Epic: Automated Validation & Fix Loop System

## Executive Summary

This epic implements a comprehensive automated quality assurance system that continuously validates, identifies, and fixes all errors in the Idle Cultivation Game codebase. Using Playwright for real browser testing and MCP for AI-assisted fixes, the system will achieve 100% error-free production code through iterative validation loops.

## Problem Context

Current validation gives false confidence - tests report "PASSED" while critical features like character creation are completely broken. This epic addresses the need for real validation that catches actual bugs, not just console errors.

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────┐
│          Validation Loop Controller          │
│         (orchestrator.js)                    │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│   Playwright  │   │   Analyzer    │
│   Test Suite  │───│   & Parser    │
└───────────────┘   └───────────────┘
        │                   │
        └─────────┬─────────┘
                  ▼
         ┌───────────────┐
         │  Error Queue  │
         │  Prioritizer  │
         └───────────────┘
                  │
                  ▼
         ┌───────────────┐
         │   MCP Fix     │
         │  Generator    │
         └───────────────┘
                  │
                  ▼
         ┌───────────────┐
         │  Validator    │
         │  & Applier    │
         └───────────────┘
                  │
                  ▼
         ┌───────────────┐
         │   Reporter    │
         │  & Logger     │
         └───────────────┘
```

### Core Components

1. **Validation Loop Controller** - Main orchestration logic
2. **Playwright Test Suite** - Browser-based testing infrastructure
3. **Error Analyzer** - Parses and categorizes errors
4. **Error Prioritizer** - Determines fix order by severity
5. **MCP Fix Generator** - AI-powered fix suggestions
6. **Fix Validator** - Tests fixes in isolation
7. **Fix Applier** - Safely applies validated fixes
8. **Reporter** - Generates comprehensive reports

## Implementation Tasks

### Task 1: Playwright Test Infrastructure
- **Priority**: P0 (Critical)
- **Effort**: 2 days
- **Dependencies**: None
- **Deliverables**:
  - Multi-browser test runner
  - Headless/headed mode support
  - Screenshot/video capture
  - Test execution framework

### Task 2: Comprehensive Test Suite
- **Priority**: P0 (Critical)
- **Effort**: 3 days
- **Dependencies**: Task 1
- **Deliverables**:
  - Character creation flow tests
  - Game state progression tests
  - Save/load functionality tests
  - UI interaction tests
  - Cross-browser compatibility tests

### Task 3: Error Detection System
- **Priority**: P0 (Critical)
- **Effort**: 2 days
- **Dependencies**: Task 1
- **Deliverables**:
  - Console error monitoring
  - Network failure detection
  - Performance degradation tracking
  - Memory leak detection
  - UI element visibility validation

### Task 4: MCP Integration for Fix Generation
- **Priority**: P1 (High)
- **Effort**: 2 days
- **Dependencies**: Task 3
- **Deliverables**:
  - MCP API connection
  - Error-to-fix mapping
  - Fix suggestion pipeline
  - Code generation templates

### Task 5: Fix Validation & Application
- **Priority**: P1 (High)
- **Effort**: 2 days
- **Dependencies**: Task 4
- **Deliverables**:
  - Isolated fix testing
  - Regression test suite
  - Rollback mechanism
  - Fix success metrics

### Task 6: Iterative Loop Controller
- **Priority**: P1 (High)
- **Effort**: 1 day
- **Dependencies**: Tasks 1-5
- **Deliverables**:
  - Main orchestration logic
  - Error prioritization
  - Convergence detection
  - Safety mechanisms

### Task 7: Reporting & Analytics
- **Priority**: P2 (Medium)
- **Effort**: 1 day
- **Dependencies**: Task 6
- **Deliverables**:
  - Real-time dashboard
  - Error trend analysis
  - Fix success tracking
  - Performance metrics

### Task 8: CI/CD Integration
- **Priority**: P2 (Medium)
- **Effort**: 1 day
- **Dependencies**: Task 6
- **Deliverables**:
  - Pre-commit hooks
  - GitHub Actions workflow
  - Deployment validation
  - Production monitoring

## Technical Specifications

### Playwright Configuration

```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/validation',
  timeout: 30000,
  retries: 2,
  workers: 4,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  reporter: [
    ['html', { outputFolder: 'test-results' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
};
```

### Error Priority Matrix

| Error Type | Priority | Auto-Fix | Manual Review |
|------------|----------|----------|---------------|
| Game Breaking (e.g., character creation) | P0 | Yes | Yes |
| Feature Failure | P1 | Yes | Optional |
| Console Errors | P2 | Yes | No |
| Performance Issues | P2 | Partial | Yes |
| Visual Glitches | P3 | No | Yes |
| Warnings | P3 | Optional | No |

### Fix Validation Process

```javascript
async function validateFix(fix, error) {
  // 1. Create isolated test environment
  const sandbox = await createSandbox();

  // 2. Apply fix
  await sandbox.applyFix(fix);

  // 3. Run targeted tests
  const testResults = await sandbox.runTests([
    error.affectedTest,
    ...error.relatedTests
  ]);

  // 4. Check for regressions
  const regressionResults = await sandbox.runRegressionSuite();

  // 5. Measure performance impact
  const perfMetrics = await sandbox.measurePerformance();

  // 6. Return validation report
  return {
    success: testResults.passed && !regressionResults.failures,
    testResults,
    regressionResults,
    perfMetrics,
    recommendation: determineRecommendation(testResults, regressionResults, perfMetrics)
  };
}
```

## Success Criteria

### Quantitative Metrics
- **Error Detection Rate**: 100% of functional bugs detected
- **Fix Success Rate**: > 85% of errors automatically fixed
- **False Positive Rate**: < 1%
- **Validation Time**: < 10 minutes for full suite
- **Code Coverage**: > 95% of production code tested

### Qualitative Metrics
- **Developer Confidence**: High trust in deployment readiness
- **Code Quality**: Improved maintainability scores
- **User Experience**: Zero critical bugs in production
- **Documentation**: All fixes well-documented

## Risk Mitigation

### Technical Risks

1. **AI-Generated Incorrect Fixes**
   - Validate all fixes before applying
   - Maintain rollback capability
   - Human review for critical changes

2. **Test Suite Performance**
   - Parallel test execution
   - Incremental testing
   - Smart test selection

3. **False Positives**
   - Confidence scoring for errors
   - Whitelist known issues
   - Developer override capability

### Operational Risks

1. **Infinite Fix Loops**
   - Maximum iteration limits (10 cycles)
   - Fix attempt tracking
   - Manual intervention triggers

2. **New Bug Introduction**
   - Comprehensive regression testing
   - Staged fix application
   - Monitoring after each fix

## Implementation Timeline

### Week 1
- **Days 1-2**: Playwright infrastructure setup
- **Days 3-5**: Comprehensive test suite development

### Week 2
- **Days 6-7**: Error detection system
- **Days 8-9**: MCP integration
- **Days 10-11**: Fix validation & application
- **Day 12**: Loop controller & reporting
- **Days 13-14**: CI/CD integration & polish

## Dependencies

### External
- Playwright v1.40+
- MCP API access
- Node.js v18+
- Chrome, Firefox, Safari, Edge browsers

### Internal
- Game codebase in testable state
- Local development server
- Git version control
- Test configuration files

## Monitoring & Maintenance

### Key Metrics to Track
- Error detection rate
- Fix success rate
- System uptime
- Performance impact
- Developer productivity

### Maintenance Schedule
- Daily: Review error logs
- Weekly: Update test suite
- Monthly: Performance optimization
- Quarterly: Architecture review

## Conclusion

This epic will transform the game's QA process from reactive to proactive, catching real bugs that affect gameplay rather than just checking for console errors. The automated fix generation will dramatically reduce debugging time while ensuring production stability.