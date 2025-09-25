---
name: Fix-Game
status: backlog
created: 2025-09-25T00:26:03Z
progress: 0%
prd: .claude/prds/Fix-Game.md
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/112
---

# Epic: Fix-Game

## Overview

This epic implements a comprehensive fix for all game-breaking issues, ensuring the Idle Cultivation game runs reliably from initial load through complete gameplay progression. Rather than adding complexity, we'll fix existing systems, validate all game mechanics work correctly, and implement automated testing to prevent future regressions.

## Architecture Decisions

### Key Technical Decisions
- **Fix Don't Replace**: Repair existing systems rather than rewriting
- **Validation First**: Build comprehensive test suite before making changes
- **Incremental Fixes**: Test each fix in isolation before combining
- **Simulation Testing**: Automated gameplay simulation to verify all mechanics
- **Minimal Dependencies**: No new libraries or frameworks

### Technology Choices
- Vanilla JavaScript (no build system required)
- Puppeteer for automated testing
- Browser localStorage for persistence
- Console logging for debugging

### Design Patterns
- **Error Boundary Pattern**: Wrap all critical operations
- **Null Object Pattern**: Safe defaults for undefined values
- **Observer Pattern**: Existing event system for state updates
- **Factory Pattern**: Fix existing module factories

## Technical Approach

### Frontend Components
**Loading & Error UI**
- Fix existing LoadingManager
- Repair ErrorDisplay component
- Character creation reliability

**Game UI Components**
- Fix ViewManager state updates
- Repair GameView rendering
- Fix UI panel updates (stats, inventory, etc.)

**State Management**
- Fix GameState initialization
- Repair save/load mechanisms
- Fix state validation

### Core Systems
**Module System**
- Fix module factory implementations
- Correct dependency resolution
- Add proper error handling
- Fix API method calls (reportError vs handleError)

**Game Mechanics**
- Fix CP calculation formulas
- Repair combat damage calculations
- Fix crafting system logic
- Repair shop transaction handling

**Resource Systems**
- Fix Qi generation rates
- Repair Spirit Stone accumulation
- Fix material drops from combat

### Infrastructure
**Testing Framework**
- Automated gameplay simulation
- Load testing from all environments
- Save/load validation suite
- Performance benchmarking

**Error Recovery**
- Safe mode activation
- State recovery mechanisms
- Graceful degradation

## Implementation Strategy

### Development Phases
1. **Diagnosis Phase**: Map all failures and build test framework
2. **Core Fix Phase**: Fix critical loading and module issues
3. **Mechanics Phase**: Repair all game calculations and systems
4. **Validation Phase**: Complete gameplay simulation testing

### Risk Mitigation
- Test each fix in isolation
- Maintain backward compatibility
- Create rollback points
- No merge without full validation

### Testing Approach
- Unit tests for each system
- Integration tests for module loading
- End-to-end gameplay simulation
- Multi-hour idle testing
- Cross-browser validation

## Task Breakdown Preview

Simplified task structure focusing on fixing existing code:

- [ ] **Task 1: Diagnostic Test Suite** - Build comprehensive test framework with gameplay simulation
- [ ] **Task 2: Fix Module System** - Repair module loading, factories, and dependency resolution
- [ ] **Task 3: Fix Core Game Loop** - Repair initialization, game loop, and state management
- [ ] **Task 4: Fix Character & UI** - Ensure character creation and UI updates work reliably
- [ ] **Task 5: Fix Game Mechanics** - Repair combat, crafting, shop, and progression calculations
- [ ] **Task 6: Fix Save System** - Ensure save/load works at every game stage
- [ ] **Task 7: Gameplay Validation** - Run complete simulation through all game content
- [ ] **Task 8: Performance & Polish** - Optimize loading, fix remaining errors, update docs

## Dependencies

### External Dependencies
- None (vanilla JavaScript only)

### Internal Dependencies
- Existing module architecture
- Current save format
- Existing UI components
- Current game mechanics

### Prerequisite Work
- Access to all game files
- Understanding of intended game mechanics
- List of all known errors

## Success Criteria (Technical)

### Performance Benchmarks
- Page load < 3 seconds
- Character creation < 100ms response
- Module load < 30 seconds total
- Memory usage < 100MB
- Zero uncaught exceptions

### Quality Gates
- All modules load successfully
- Character creation 100% success rate
- All game mechanics calculate correctly
- Save/load works at any point
- No blank screens ever

### Acceptance Criteria
**Must Pass Automated Tests:**
- Load from file://, localhost, production
- Create character and progress to end-game
- Combat with all monsters
- Use all skills successfully
- Craft all items
- Complete all shop transactions
- Save/load at 10+ different progression points
- Run for 2+ hours without errors

## Estimated Effort

### Overall Timeline
- **Total Duration**: 2-3 days
- **Phase 1 (Diagnosis)**: 4-6 hours
- **Phase 2 (Core Fixes)**: 8-10 hours
- **Phase 3 (Mechanics)**: 6-8 hours
- **Phase 4 (Validation)**: 4-6 hours

### Resource Requirements
- Single developer
- Test browsers (Chrome, Firefox, Safari)
- 2-3 days focused effort

### Critical Path Items
1. Module loading fixes (blocks everything)
2. Character creation (blocks gameplay)
3. Game loop initialization (blocks mechanics)
4. Save/load functionality (blocks progression testing)

## Tasks Created
- [ ] #114 - Diagnostic Test Suite (parallel: true)
- [ ] #116 - Fix Module System (parallel: false, depends on: #114)
- [ ] #118 - Fix Core Game Loop (parallel: false, depends on: #116)
- [ ] #120 - Fix Character & UI (parallel: true with #118, depends on: #116)
- [ ] #113 - Fix Game Mechanics (parallel: true with #115, depends on: #118)
- [ ] #115 - Fix Save System (parallel: true with #113, depends on: #118)
- [ ] #117 - Gameplay Validation (parallel: false, depends on: all previous)
- [ ] #119 - Performance & Polish (parallel: false, depends on: #117)

**Total tasks:** 8
**Parallel tasks:** 4 (001, 004 with 003, 005 with 006)
**Sequential tasks:** 4 (002, 003, 007, 008)
**Estimated total effort:** 196-240 hours (24-30 days)