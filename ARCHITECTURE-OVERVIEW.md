# Idle Cultivation Game - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Browser)                      │
├─────────────────────────────────────────────────────────────────┤
│                           UI Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │ ViewManager │ │ UIManager   │ │BaseComponent│ │ Animations   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                      Game Systems Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │ Cultivation │ │   Combat    │ │  Scripture  │ │    Sect      ││
│  │   System    │ │   System    │ │   System    │ │   System     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │    Mount    │ │    Wing     │ │ Accessories │ │    Runes     ││
│  │   System    │ │   System    │ │   System    │ │   System     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │  Meridian   │ │   Dantian   │ │    Soul     │ │ Constellation││
│  │   System    │ │   System    │ │   System    │ │   System     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                        Core Systems                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │ EventManager│ │  GameState  │ │TimeManager  │ │  GameLoop    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │SaveManager  │ │ModuleManager│ │ErrorManager │ │Performance   ││
│  │             │ │             │ │             │ │Monitor       ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                      Data Storage                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                LocalStorage                                 ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           ││
│  │  │ Game State  │ │   Backups   │ │ User Prefs  │           ││
│  │  │(Compressed) │ │             │ │             │           ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                    │
├─────────────────────────────────────────────────────────────────┤
│                      API Layer (Minimal)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐│
│  │   Health    │ │    CORS     │ │    Rate     │ │   Security   ││
│  │  Endpoint   │ │ Middleware  │ │  Limiting   │ │ Middleware   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                    Static File Serving                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Express.js Server                            ││
│  │         (Serves HTML, CSS, JS, Assets)                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
User Action
    ↓
┌─────────────────┐    Event     ┌─────────────────┐
│   UI Component  │─────────────→│  Event Manager  │
└─────────────────┘              └─────────────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ↓                      ↓                      ↓
         ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         │ Game System A   │    │ Game System B   │    │ Game System C   │
         │ (Cultivation)   │    │   (Combat)      │    │  (Scripture)    │
         └─────────────────┘    └─────────────────┘    └─────────────────┘
                  │                      │                      │
                  └──────────────────────┼──────────────────────┘
                                         ↓
                                ┌─────────────────┐
                                │   Game State    │
                                │   (Central)     │
                                └─────────────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ↓                      ↓                      ↓
         ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         │  Save Manager   │    │   UI Manager    │    │ Event Listeners │
         └─────────────────┘    └─────────────────┘    └─────────────────┘
                  │                      │                      │
                  ↓                      ↓                      ↓
         ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         │  LocalStorage   │    │  UI Updates     │    │ System Reactions│
         │  (Persistent)   │    │  (Visual)       │    │  (Cascading)    │
         └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Process Flow Examples

### 1. Player Cultivates Qi
```
1. User clicks "Cultivate Qi" button
2. CultivationView emits 'cultivation:startQi' event
3. CultivationSystem receives event
4. TimeManager calculates cultivation progress
5. CultivationSystem updates qi experience in GameState
6. PowerCalculator recalculates total power
7. EventManager emits 'power:updated' event
8. UI components update displays
9. SaveManager triggers auto-save to localStorage
```

### 2. Player Unlocks Mount System
```
1. Player reaches Foundation Building Stage 3
2. RealmManager emits 'realm:breakthrough' event
3. MountSystem checks unlock requirements
4. MountSystem adds mount unlock to GameState
5. UI emits 'mount:unlocked' notification
6. ViewManager enables mount tab
7. SaveManager persists unlock state
```

### 3. Game Load Process
```
1. Page loads, main.js initializes
2. SaveManager loads data from localStorage
3. MigrationManager updates save format if needed
4. GameState restores from saved data
5. ModuleManager initializes systems with dependencies
6. TimeManager calculates offline progress
7. UI systems render current state
8. Game loop starts (60fps UI, 10fps logic)
```

## Key Architectural Benefits

### Frontend-Heavy Design
- **Offline First**: Game works without internet
- **Low Latency**: No server round trips for game actions
- **Scalable**: Minimal server resources required
- **Responsive**: 60fps UI updates

### Modular Systems
- **Maintainable**: Clear separation of concerns
- **Testable**: Each system can be tested independently
- **Extensible**: Easy to add new progression systems
- **Hot Reload**: Development-friendly module replacement

### Event-Driven Communication
- **Decoupled**: Systems don't directly reference each other
- **Flexible**: Easy to add new behaviors and reactions
- **Debuggable**: Clear audit trail of system interactions
- **Performant**: Efficient pub/sub pattern

### Robust Data Management
- **Reliable**: Multiple backup and recovery mechanisms
- **Efficient**: Compressed storage saves space
- **Versioned**: Automatic migration between updates
- **Atomic**: Prevents save corruption

This architecture provides excellent performance, maintainability, and user experience while being prepared for future enhancements like multiplayer features and cloud saves.