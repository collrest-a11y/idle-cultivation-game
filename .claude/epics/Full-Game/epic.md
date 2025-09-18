---
name: Full-Game
status: backlog
created: 2025-09-18T03:14:54Z
progress: 0%
prd: .claude/prds/Full-Game.md
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/1
---

# Epic: Full-Game

## Overview
Complete implementation of an idle cultivation game featuring dual cultivation paths (Qi/Body), scripture collection via gacha mechanics, sect-based social features, and turn-based combat. Built as a single-page application using vanilla JavaScript with Girls' Frontline aesthetic and wuxia/xianxia themes.

## Architecture Decisions
- **Pure Vanilla Stack**: No external frameworks - HTML5, CSS3, ES6+ JavaScript only
- **Component-Based UI**: Modular UI components with consistent design patterns
- **LocalStorage Persistence**: Client-side save system with versioning and migration
- **Event-Driven Architecture**: Pub/sub pattern for loose coupling between systems
- **Idle Game Engine**: Offline calculation system with exponential progression curves
- **Mobile-First Design**: Responsive CSS Grid/Flexbox with touch-friendly interactions

## Technical Approach

### Frontend Components
- **Core Game Engine**: CultivationEngine, OfflineCalculator, SaveManager
- **UI Framework**: BaseComponent, Modal, TabContainer, ProgressBar
- **Game Screens**: CultivationView, ScriptureView, CombatView, SectView, QuestView
- **State Management**: GameState singleton with event-driven updates
- **Animation System**: CSS transitions with JavaScript timing control

### Backend Services
Since this is a client-side only game:
- **Data Models**: Player, Scripture, Sect, Quest, Achievement classes
- **Game Logic**: Cultivation algorithms, combat calculations, gacha systems
- **Persistence Layer**: LocalStorage wrapper with backup/restore capabilities
- **Migration System**: Version-aware save data updates

### Infrastructure
- **Build Process**: No build step - direct file serving
- **Performance**: Web Workers for heavy calculations, requestAnimationFrame for smooth UI
- **Error Handling**: Global error boundary with user-friendly fallbacks
- **Testing**: Jest for unit tests, manual integration testing

## Implementation Strategy
1. **Core Foundation**: Establish game engine, save system, and basic UI framework
2. **Cultivation System**: Implement dual-path progression with offline calculations
3. **Content Systems**: Add scripture gacha, combat mechanics, and quest framework
4. **Social Features**: Build sect system with member interactions
5. **Polish Phase**: UI refinement, balance tuning, and comprehensive testing

## Task Breakdown Preview
High-level task categories that will be created:
- [ ] Core Engine: Game state, save system, offline calculations
- [ ] Cultivation System: Qi/Body progression, realm breakthroughs, techniques
- [ ] Scripture Collection: Gacha mechanics, enhancement, synergy systems
- [ ] Combat System: Turn-based duels, power calculations, rankings
- [ ] Sect Features: Creation, joining, activities, competitions
- [ ] Quest Framework: Daily/weekly quests, achievements, rewards
- [ ] UI Polish: GFL aesthetic, responsive design, animations
- [ ] Balance & Testing: Progression curves, performance optimization

## Dependencies
- Modern browser with ES6+ support (Chrome 60+, Firefox 55+, Safari 10.1+)
- LocalStorage API (>5MB capacity recommended)
- CSS Grid and Flexbox support
- HTML5 Canvas API (for potential visual effects)

## Success Criteria (Technical)
- **Performance**: 60fps gameplay, <2s offline calculations, <1s save/load
- **Reliability**: Zero data loss, graceful error recovery, stable memory usage
- **Usability**: Mobile-responsive, <3s initial load, intuitive navigation
- **Quality**: 100% test coverage for core systems, zero TypeScript errors

## Estimated Effort
- **Overall Timeline**: 6-8 weeks full implementation
- **Critical Path**: Core engine → Cultivation → Content systems → Social features
- **Resource Requirements**: Single developer, modern development environment
- **Risk Factors**: Balance tuning iterations, performance optimization challenges

## Tasks Created
- [ ] #10 - Game Views & Screen Implementation (parallel: false)
- [ ] #11 - Polish, Balance & Performance (parallel: false)
- [ ] #2 - Core Game Engine & State Management (parallel: false)
- [ ] #3 - Save System & Data Persistence (parallel: false)
- [ ] #4 - Base UI Framework & Components (parallel: true)
- [ ] #5 - Cultivation System Core (parallel: true)
- [ ] #6 - Scripture Collection & Gacha (parallel: true)
- [ ] #7 - Combat System & Dueling (parallel: true)
- [ ] #8 - Sect System & Social Features (parallel: true)
- [ ] #9 - Quest System & Achievements (parallel: true)

Total tasks: 10
Parallel tasks: 6
Sequential tasks: 4
Estimated total effort: 24-28 days
