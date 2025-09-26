---
name: real-error-handler
status: backlog
created: 2025-09-26T13:07:44Z
updated: 2025-09-26T14:34:51Z
progress: 0%
prd: .claude/prds/real-error-handler.md
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/142
---

# Epic: Real Error Handler

## Overview

Implement a production-ready, self-healing error handling system that provides automatic recovery, real-time monitoring, and state preservation for the idle cultivation game. This system will leverage the existing ErrorRecovery.js component (already created) and build upon the current error infrastructure to achieve 85%+ automatic recovery rate with <2 second MTTR. Every component will be actual working code with full Playwright test coverage.

## Architecture Decisions

### Key Technical Decisions

1. **Leverage Existing Infrastructure**: Build upon the already-created ErrorRecovery.js (836 lines of production code) rather than starting from scratch
2. **Event-Driven Architecture**: Use existing EventManager for error propagation to maintain consistency
3. **Progressive Enhancement**: Start with critical error handling, then add monitoring layers
4. **Browser-Native First**: Utilize browser APIs (ErrorEvent, Storage) before external dependencies
5. **Modular Recovery Strategies**: Implement strategy pattern for different error types

### Technology Choices

- **Error Capture**: Native window.onerror and unhandledrejection events
- **State Management**: Existing SaveManager with checkpoint enhancements
- **Monitoring**: LocalStorage for client-side metrics, minimal server reporting
- **Testing**: Playwright MCP for real browser validation
- **UI Framework**: Vanilla JavaScript for zero-dependency implementation

### Design Patterns

- **Circuit Breaker**: Already implemented in ErrorRecovery.js - enhance with service-specific breakers
- **Strategy Pattern**: Different recovery approaches per error type
- **Observer Pattern**: Error event notifications through EventManager
- **Singleton**: Single ErrorHandler instance managing all error flows
- **Facade**: Simplified API over complex recovery mechanisms

## Technical Approach

### Core Components Integration

Since ErrorRecovery.js already exists with circuit breakers, retry logic, and recovery strategies, we'll focus on:

1. **Enhanced ErrorHandler.js** - Orchestrate existing recovery with new classification
2. **Simplified ErrorClassifier.js** - Lightweight categorization using existing patterns
3. **Minimal ErrorMonitor.js** - Real-time metrics without external dependencies
4. **Integrated Testing** - Playwright tests validating actual recovery scenarios

### Frontend Components

- **ErrorNotification.js**: Subtle toast notifications with recovery progress
- **ErrorDashboard.js**: Developer-only panel showing metrics and logs
- **Integration with existing UI**: Enhance current error displays in game

### State Preservation

- Enhance existing SaveManager with automatic checkpointing
- Leverage GameState for rollback capabilities
- Add corruption detection and repair

### Infrastructure

- Client-side error storage with automatic rotation
- Batched error reporting to minimize network calls
- Performance monitoring integrated into existing systems

## Implementation Strategy

### Simplified Approach (Leveraging Existing Code)

1. **Integrate existing ErrorRecovery.js** with game systems
2. **Add classification layer** for better error handling
3. **Create minimal UI components** for user feedback
4. **Implement comprehensive Playwright tests**
5. **Add monitoring without external dependencies**

### Risk Mitigation

- Use existing, tested components (ErrorRecovery.js) as foundation
- Implement feature flags for gradual rollout
- Maintain fallback to current error handling
- Test each component in isolation before integration

### Testing Approach

- Error injection framework for controlled testing
- Playwright scenarios covering all error types
- Performance benchmarks ensuring <10ms overhead
- Recovery validation with state verification

## Task Breakdown Preview

Limited to 8 essential tasks for efficiency:

- [ ] **Task 1: ErrorHandler Integration** - Wire existing ErrorRecovery.js into game systems with actual implementation
- [ ] **Task 2: Error Classification System** - Create ErrorClassifier.js for categorization and fingerprinting
- [ ] **Task 3: State Checkpointing** - Enhance SaveManager with automatic checkpoint creation
- [ ] **Task 4: User Notification UI** - Build ErrorNotification.js for non-intrusive user feedback
- [ ] **Task 5: Developer Dashboard** - Create ErrorDashboard.js for monitoring and debugging
- [ ] **Task 6: Client-Side Monitoring** - Implement ErrorMonitor.js for metrics without external deps
- [ ] **Task 7: Playwright Test Suite** - Comprehensive error injection and recovery tests
- [ ] **Task 8: Production Integration** - Final integration, performance optimization, and deployment

## Dependencies

### External Service Dependencies
- Browser APIs (ErrorEvent, Storage, Fetch) - all available
- Playwright MCP for testing - confirmed available
- No external monitoring services required (client-side only)

### Internal Dependencies
- **ErrorRecovery.js** - ✅ Already created (836 lines)
- **SaveManager** - ✅ Exists, needs checkpoint enhancement
- **EventManager** - ✅ Available for error propagation
- **ModuleManager** - ✅ Can be used for hot-reloading

### Prerequisite Work
All prerequisites are already complete:
- ErrorRecovery.js with circuit breakers ✅
- Save system with state validation ✅
- Module loading infrastructure ✅

## Success Criteria (Technical)

### Performance Benchmarks
- Error detection overhead: <10ms
- Recovery initiation: <100ms
- Full recovery completion: <2 seconds
- Memory usage for error tracking: <5MB
- Zero performance impact during normal operation

### Quality Gates
- 100% Playwright test coverage for error scenarios
- 85%+ automatic recovery rate in testing
- Zero data loss during recovery
- All files created with Write/MultiEdit tools
- Every component executable and verifiable

### Acceptance Criteria
- All 8 tasks result in actual working code
- Integration with existing game systems complete
- User notifications provide clear feedback
- Developer dashboard shows real-time metrics
- 10+ different error types successfully recovered

## Estimated Effort

### Overall Timeline
- **Total Duration**: 5-7 days (reduced from 14 days by leveraging existing code)
- **Parallel Execution**: Can complete in 3-4 days with parallel tasks

### Resource Requirements
- 1 developer for implementation
- Playwright MCP access for testing
- Test browsers (Chrome, Firefox, Safari, Edge)

### Critical Path Items
1. ErrorHandler integration (blocks all other work)
2. Playwright tests (blocks deployment)
3. Production integration (final gate)

### Parallel Opportunities
- Tasks 2-6 can run in parallel after Task 1
- UI components (Tasks 4-5) independent of core logic
- Testing can begin as soon as first component ready

## Validation Requirements

Each task implementation MUST:
1. **CREATE actual files** using Write/MultiEdit tools - no simulations
2. **CONTAIN complete working code** - no stubs or placeholders
3. **BE TESTED** with Playwright MCP in real browser
4. **INTEGRATE** with existing game systems
5. **BE VERIFIABLE** with Read tool and executable in browser
6. **INCLUDE performance metrics** proving <10ms overhead

## Success Metrics

The epic is complete when:
- All 8 tasks have actual code implementations
- Playwright tests achieve 100% pass rate
- Error recovery rate exceeds 85% in live testing
- Dashboard displays real-time error metrics
- User notifications work without disruption
- Performance overhead verified under 10ms
- 10+ error types recover successfully
- State preservation confirmed with zero data loss

## Tasks Created
- [ ] #143 - ErrorHandler Integration (parallel: false)
- [ ] #144 - Error Classification System (parallel: true)
- [ ] #145 - State Checkpointing (parallel: true)
- [ ] #146 - User Notification UI (parallel: true)
- [ ] #147 - Developer Dashboard (parallel: true)
- [ ] #148 - Client-Side Monitoring (parallel: true)
- [ ] #149 - Playwright Test Suite (parallel: false)
- [ ] #150 - Production Integration (parallel: false)

Total tasks: 8
Parallel tasks: 5
Sequential tasks: 3
Estimated total effort: 144 hours (18 days solo, 6-8 days with parallelization)
