---
name: CP-Progression-Systems
status: backlog
created: 2025-09-18T12:32:02Z
progress: 0%
prd: .claude/prds/CP-Progression-Systems.md
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/64
---

# Epic: CP-Progression-Systems

## Overview
Implement comprehensive Combat Power progression systems that unlock through cultivation advancement, adding 8 major enhancement categories: Mounts, Wings, Accessories, Enhanced Runes, Meridians, Dantian, Soul Cultivation, and Constellations. These systems will integrate with the existing PowerCalculator to provide approximately 40-50% of total CP contribution while maintaining thematic authenticity and idle game progression patterns.

## Architecture Decisions

### **Data Architecture**
- **Modular System Design**: Each progression system (mount, wings, etc.) as independent modules with common interfaces
- **Unified Enhancement Framework**: Shared base classes for equipment-based systems (mounts, wings, accessories)
- **Cultivation-Gated Unlocks**: Systems unlock based on cultivation realm progression rather than level-based gates
- **Shared Material Economy**: Leverage existing jade/spirit crystals with new progression-specific materials

### **Technical Patterns**
- **Observer Pattern**: Systems listen to cultivation realm changes for auto-unlocking
- **Command Pattern**: Enhancement actions (feeding, training, evolution) as executable commands
- **Strategy Pattern**: Different calculation strategies for each system's CP contribution
- **Flyweight Pattern**: Shared progression data templates to minimize memory usage

### **Integration Points**
- **PowerCalculator Extension**: Add new formula methods for each progression system
- **GameState Extension**: New state branches for each progression system
- **EventManager Integration**: Events for unlocks, upgrades, and achievements
- **SaveManager**: Migration support for new progression data structures

## Technical Approach

### **Frontend Components**

#### **Core UI Components**
- `ProgressionSystemPanel` - Base component for all progression systems
- `EnhancementSlot` - Reusable component for mount/wing/accessory display
- `MaterialRequirementDisplay` - Shows evolution/upgrade costs
- `UnlockProgressIndicator` - Shows progress toward system unlocks

#### **System-Specific Views**
- `MountStableView` - Mount management and feeding interface
- `WingCultivationView` - Wing training and feather collection
- `AccessoryForgeView` - Ring/amulet/talisman socketing and sets
- `RuneSocketingView` - Enhanced rune system with expanded sockets
- `MeridianMapView` - Acupuncture point visualization and opening
- `DantianChamberView` - Energy center cultivation interface
- `SoulRealmView` - Soul cultivation and manifestation
- `ConstellationChartView` - Star map and celestial alignment

#### **State Management**
- React-style state lifting to parent containers
- Local component state for UI interactions
- Global state integration for persistence
- Real-time updates for idle progression

### **Backend Services**

#### **Data Models**
```javascript
// Core progression system interface
class ProgressionSystem {
    constructor(type, gameState, eventManager) {
        this.type = type;
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.unlockedAt = null;
        this.cpContribution = 0;
    }

    checkUnlockConditions() { /* realm-based unlock logic */ }
    calculateCPContribution() { /* system-specific CP calculation */ }
    processIdleGains(timeElapsed) { /* idle progression logic */ }
}

// Equipment-based systems (Mount, Wings, Accessories)
class EnhancementSystem extends ProgressionSystem {
    constructor(type, gameState, eventManager) {
        super(type, gameState, eventManager);
        this.items = new Map();
        this.activeItem = null;
    }

    equipItem(itemId) { /* equipment logic */ }
    upgradeItem(itemId, materials) { /* upgrade logic */ }
    evolveItem(itemId, materials) { /* evolution logic */ }
}

// Cultivation-based systems (Meridians, Dantian, Soul)
class CultivationSystem extends ProgressionSystem {
    constructor(type, gameState, eventManager) {
        super(type, gameState, eventManager);
        this.openedPoints = new Set();
        this.cultivationProgress = 0;
    }

    openPoint(pointId, materials) { /* point opening logic */ }
    cultivateEnergy(timeSpent) { /* cultivation logic */ }
}
```

#### **Power Calculator Integration**
```javascript
// Extend existing COMBAT_FORMULAS
const PROGRESSION_FORMULAS = {
    mountPower: (mount, bondLevel) => {
        if (!mount) return 0;
        const basePower = mount.tier * mount.level * 50;
        const bondMultiplier = 1 + (bondLevel * 0.05);
        return Math.floor(basePower * bondMultiplier);
    },

    wingPower: (wings, featherCount) => {
        if (!wings) return 0;
        const basePower = wings.tier * wings.level * 40;
        const featherBonus = featherCount * 2;
        return Math.floor(basePower + featherBonus);
    },

    accessoryPower: (accessories) => {
        let totalPower = 0;
        accessories.forEach(accessory => {
            if (accessory) {
                totalPower += accessory.tier * accessory.level * 30;
            }
        });
        return Math.floor(totalPower);
    }
    // ... other system calculations
};
```

#### **Material Management**
```javascript
class MaterialManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.materials = new Map();
    }

    addMaterial(materialId, quantity) { /* add materials */ }
    consumeMaterials(requirements) { /* consume for upgrades */ }
    checkRequirements(requirements) { /* validate sufficient materials */ }
}
```

### **Infrastructure**

#### **Performance Considerations**
- **Lazy Loading**: Only initialize progression systems when unlocked
- **Calculation Caching**: Cache CP contributions with invalidation on changes
- **Batch Updates**: Group multiple progression updates into single state changes
- **Web Workers**: Heavy calculations (constellation alignments, complex formulas) in background

#### **Scalability**
- **Modular Loading**: Each progression system as separate JS module
- **Data Pagination**: Large collections (accessories, runes) with virtual scrolling
- **Memory Management**: Cleanup unused progression data, shared template objects

## Implementation Strategy

### **Phase 1: Foundation (Weeks 1-2)**
1. **Core Architecture Setup**
   - Create base ProgressionSystem class and interfaces
   - Extend PowerCalculator with progression formulas
   - Add progression state branches to GameState
   - Implement realm-based unlock system

2. **Material System**
   - Define all progression-specific materials
   - Implement MaterialManager for requirements/consumption
   - Add material sources to existing systems (combat, quests, gacha)

### **Phase 2: Equipment Systems (Weeks 3-4)**
3. **Mount System Implementation**
   - Mount data structures and evolution paths
   - Feeding/bonding mechanics with idle progression
   - Mount stable UI and management interface

4. **Wing System Implementation**
   - Wing categories and transformation system
   - Feather collection and flight training
   - Wing cultivation UI with visual effects

### **Phase 3: Advanced Systems (Weeks 5-6)**
5. **Enhanced Rune & Accessory Systems**
   - Expanded socket system for all equipment types
   - Set bonuses and advanced accessory effects
   - Socket management UI with drag-drop

6. **Cultivation-Specific Systems**
   - Meridian opening system with acupuncture point map
   - Dantian cultivation with energy center management
   - Basic soul cultivation framework

### **Phase 4: Transcendent Systems (Week 7)**
7. **Advanced Features**
   - Constellation/star map system
   - Complete soul cultivation with manifestation
   - System integration and balancing

8. **UI/UX Polish**
   - Visual effects and animations
   - Tutorial integration for each system
   - Achievement integration

## Task Breakdown Preview

- [ ] **Core Framework**: Base classes, interfaces, and power calculation integration
- [ ] **Mount System**: Data models, feeding mechanics, bonding, and stable UI
- [ ] **Wing System**: Feather collection, flight training, transformation system, and UI
- [ ] **Enhanced Accessories**: Expanded slots, set bonuses, socketing system, and forge UI
- [ ] **Advanced Runes**: Multi-socket system, divine runes, and enhanced socketing UI
- [ ] **Meridian System**: Acupuncture points, opening mechanics, and meridian map UI
- [ ] **Dantian Cultivation**: Energy centers, expansion methods, and cultivation chamber UI
- [ ] **Soul & Constellation Systems**: Soul cultivation, star charts, and advanced UIs
- [ ] **Integration & Polish**: System balancing, visual effects, tutorials, and achievements

## Dependencies

### **Internal Dependencies**
- **PowerCalculator** - Must be extended before other systems can contribute CP
- **Cultivation System** - Realm progression drives system unlocks
- **Material Economy** - New materials must integrate with existing jade/crystal systems
- **EventManager** - All systems need event integration for achievements and notifications

### **External Dependencies**
- **UI Framework** - Existing BaseComponent system for consistent UI patterns
- **Animation Library** - Visual effects for wings, constellation alignment, soul manifestation
- **Local Storage** - Save system must handle increased data complexity

### **Technical Constraints**
- **Memory Usage** - Large progression trees require careful memory management
- **Mobile Performance** - Complex visual systems must remain responsive on mobile devices
- **Save Compatibility** - Migration system required for existing saves

## Success Criteria (Technical)

### **Performance Benchmarks**
- **CP Calculation Speed**: All progression systems contribute to power calculation in <50ms
- **UI Responsiveness**: System UIs load and update in <100ms
- **Memory Usage**: Total progression data <50MB in typical endgame scenarios
- **Save/Load Time**: Save files with all progression data load in <2 seconds

### **Quality Gates**
- **Test Coverage**: 90%+ unit test coverage for all progression calculations
- **Integration Testing**: All systems properly unlock based on realm progression
- **Balance Validation**: CP contribution percentages match PRD specifications (40-50% total)
- **Mobile Compatibility**: All progression UIs functional on 360px minimum width

### **Acceptance Criteria**
- **System Unlocks**: Each system unlocks at specified cultivation realm automatically
- **CP Integration**: Power calculator correctly includes all progression system contributions
- **Idle Progression**: All systems continue progressing during offline time
- **Save Persistence**: All progression data persists through save/load cycles
- **Tutorial Integration**: Each system has guided introduction for new players
- **Achievement Hooks**: All major progression milestones trigger achievements

## Estimated Effort

### **Overall Timeline**: 7 weeks for complete implementation
- **Week 1-2**: Core framework and architecture (25% progress)
- **Week 3-4**: Mount and wing systems (50% progress)
- **Week 5-6**: Accessories, runes, and cultivation systems (80% progress)
- **Week 7**: Advanced systems, integration, and polish (100% progress)

### **Resource Requirements**
- **1 Senior Developer**: Core architecture and complex systems (meridians, constellations)
- **1 Mid-Level Developer**: Equipment systems and UI implementation
- **0.5 UI/UX Designer**: Visual design for progression interfaces
- **0.25 Game Designer**: Balance tuning and progression curves

### **Critical Path Items**
1. **PowerCalculator Extension** - Blocks all other system implementations
2. **Base ProgressionSystem Architecture** - Required for all specific systems
3. **GameState Schema Updates** - Must be completed before system implementations
4. **Material System Foundation** - Required for upgrade/evolution mechanics

## Tasks Created
- [ ] #65 - Core Framework Implementation (parallel: false)
- [ ] #66 - Mount System Implementation (parallel: true)
- [ ] #67 - Wing System Implementation (parallel: true)
- [ ] #68 - Enhanced Accessories System (parallel: true)
- [ ] #69 - Advanced Runes System (parallel: true)
- [ ] #70 - Meridian System Implementation (parallel: true)
- [ ] #71 - Dantian Cultivation System (parallel: true)
- [ ] #72 - Soul & Constellation Systems (parallel: true)
- [ ] #73 - Integration & Polish (parallel: false)

Total tasks: 9
Parallel tasks: 7
Sequential tasks: 2
Estimated total effort: 7 weeks

This epic provides a comprehensive pathway to implement the complex CP progression systems while maintaining code quality, performance, and the authentic cultivation game experience that players expect.