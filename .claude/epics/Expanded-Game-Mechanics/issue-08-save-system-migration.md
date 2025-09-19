---
issue_number: TBD
title: Save System Migration - Update Save/Load for New Data Structures
labels: ['system', 'migration', 'data']
epic: Expanded-Game-Mechanics
priority: high
estimated_effort: 2-3 days
dependencies: ['issue-01-scripture-enhancement-system', 'issue-03-seasonal-event-framework', 'issue-05-pvp-tournament-system', 'issue-07-reward-integration']
status: backlog
assignee: TBD
---

# Issue: Save System Migration - Update Save/Load for New Data Structures

## Description
Extend the existing SaveManager and MigrationManager to handle new data structures introduced by scripture enhancement, seasonal events, tournaments, and enhanced rewards. This includes creating migration scripts, version management, and ensuring backward compatibility with existing save files.

## Acceptance Criteria

### Data Structure Extensions
- [ ] Scripture enhancement data (level, XP, evolution status)
- [ ] Event participation and progress tracking
- [ ] Tournament history and rankings
- [ ] Enhanced reward inventory and history
- [ ] New player statistics and achievements

### Migration System
- [ ] Automated migration for existing save files
- [ ] Version detection and appropriate migration path selection
- [ ] Rollback capability for failed migrations
- [ ] Migration progress tracking and error reporting
- [ ] Dry-run migration testing without data modification

### Backward Compatibility
- [ ] Support for saves without new data structures
- [ ] Default value assignment for missing fields
- [ ] Graceful handling of corrupted new data
- [ ] Legacy data format support during transition period
- [ ] Emergency fallback to previous save version

### Data Validation
- [ ] Schema validation for all new data structures
- [ ] Cross-reference validation between related data
- [ ] Corruption detection and repair mechanisms
- [ ] Performance validation for save/load operations
- [ ] Memory usage optimization for new data

## Technical Implementation

### Files to Create/Modify
- `js/core/SaveManager.js` - Extend with new data handling
- `js/core/MigrationManager.js` - Add new migration scripts
- `js/core/DataValidator.js` - Extend validation for new structures
- `js/data/migration-scripts.js` - New version migration logic
- `js/utils/SaveDataUpgrader.js` - Utility for save data upgrades

### Enhanced Save Data Schema
```javascript
// Updated save data structure
const saveDataSchema = {
  version: "2.0.0",
  metadata: {
    createdAt: Date,
    lastSaved: Date,
    gameVersion: String,
    playerId: String,
    migrationHistory: Array
  },

  // Existing data (unchanged)
  player: { /* existing player data */ },
  cultivation: { /* existing cultivation data */ },
  quests: { /* existing quest data */ },
  sect: { /* existing sect data */ },
  combat: { /* existing combat data */ },

  // NEW: Scripture enhancement data
  scriptureEnhancements: {
    version: "1.0.0",
    scriptures: Map, // scriptureId -> enhancement data
    globalStats: {
      totalEnhancementsPerformed: Number,
      totalXpGained: Number,
      totalEvolutions: Number
    }
  },

  // NEW: Event system data
  eventData: {
    version: "1.0.0",
    participationHistory: Map, // eventId -> participation data
    activeEventProgress: Map, // eventId -> current progress
    eventStatistics: {
      eventsParticipated: Number,
      eventsCompleted: Number,
      totalEventRewards: Number
    }
  },

  // NEW: Tournament data
  tournamentData: {
    version: "1.0.0",
    participationHistory: Array, // tournament participation records
    rankings: {
      currentRating: Number,
      seasonalRating: Number,
      bestRanking: Number,
      winLossRecord: { wins: Number, losses: Number }
    },
    statistics: {
      tournamentsEntered: Number,
      tournamentsWon: Number,
      averagePlacement: Number
    }
  },

  // NEW: Enhanced reward data
  rewardData: {
    version: "1.0.0",
    inventory: Map, // rewardId -> reward instance
    history: Array, // claimed rewards history
    statistics: {
      totalRewardsClaimed: Number,
      totalValueClaimed: Number,
      rewardsByType: Map
    }
  }
};
```

### Migration Script Architecture
```javascript
class MigrationScript {
  constructor(fromVersion, toVersion, name) {
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
    this.name = name;
  }

  async migrate(saveData) {
    // Override in specific migration scripts
  }

  async validate(saveData) {
    // Validate migration was successful
  }

  async rollback(saveData, backupData) {
    // Rollback migration if needed
  }
}

// Example migration script
class MigrationV1ToV2 extends MigrationScript {
  constructor() {
    super("1.0.0", "2.0.0", "Add Enhanced Game Mechanics");
  }

  async migrate(saveData) {
    console.log('Migrating save data from v1.0.0 to v2.0.0');

    // Add scripture enhancement data
    if (!saveData.scriptureEnhancements) {
      saveData.scriptureEnhancements = {
        version: "1.0.0",
        scriptures: new Map(),
        globalStats: {
          totalEnhancementsPerformed: 0,
          totalXpGained: 0,
          totalEvolutions: 0
        }
      };

      // Migrate existing scriptures to enhancement format
      if (saveData.scriptures && saveData.scriptures.collection) {
        for (const [scriptureId, scripture] of saveData.scriptures.collection) {
          saveData.scriptureEnhancements.scriptures.set(scriptureId, {
            level: 1,
            currentXp: 0,
            maxXp: this.calculateXpRequirement(1),
            isEvolved: false,
            evolutionSource: null
          });
        }
      }
    }

    // Add event data
    if (!saveData.eventData) {
      saveData.eventData = {
        version: "1.0.0",
        participationHistory: new Map(),
        activeEventProgress: new Map(),
        eventStatistics: {
          eventsParticipated: 0,
          eventsCompleted: 0,
          totalEventRewards: 0
        }
      };
    }

    // Add tournament data
    if (!saveData.tournamentData) {
      saveData.tournamentData = {
        version: "1.0.0",
        participationHistory: [],
        rankings: {
          currentRating: 1200, // Starting ELO rating
          seasonalRating: 1200,
          bestRanking: null,
          winLossRecord: { wins: 0, losses: 0 }
        },
        statistics: {
          tournamentsEntered: 0,
          tournamentsWon: 0,
          averagePlacement: 0
        }
      };
    }

    // Add enhanced reward data
    if (!saveData.rewardData) {
      saveData.rewardData = {
        version: "1.0.0",
        inventory: new Map(),
        history: [],
        statistics: {
          totalRewardsClaimed: 0,
          totalValueClaimed: 0,
          rewardsByType: new Map()
        }
      };
    }

    // Update save version
    saveData.version = "2.0.0";
    saveData.metadata.migrationHistory.push({
      fromVersion: "1.0.0",
      toVersion: "2.0.0",
      timestamp: Date.now(),
      migrationName: this.name
    });

    return saveData;
  }

  calculateXpRequirement(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }
}
```

### Enhanced SaveManager Methods
```javascript
class EnhancedSaveManager extends SaveManager {
  constructor() {
    super();
    this.migrationManager = new MigrationManager();
    this.dataValidator = new DataValidator();
    this.currentVersion = "2.0.0";
  }

  async save(key, data, options = {}) {
    // Add version and metadata
    const enhancedData = {
      ...data,
      version: this.currentVersion,
      metadata: {
        ...data.metadata,
        lastSaved: Date.now(),
        gameVersion: this.currentVersion
      }
    };

    // Validate data before saving
    const validationResult = await this.dataValidator.validate(enhancedData);
    if (!validationResult.isValid) {
      throw new Error(`Save data validation failed: ${validationResult.errors.join(', ')}`);
    }

    return super.save(key, enhancedData, options);
  }

  async load(key, options = {}) {
    const loadedData = await super.load(key, options);

    if (!loadedData) {
      return null;
    }

    // Check if migration is needed
    const needsMigration = this.migrationManager.needsMigration(
      loadedData.version || "1.0.0",
      this.currentVersion
    );

    if (needsMigration) {
      console.log(`Migrating save data from ${loadedData.version || "1.0.0"} to ${this.currentVersion}`);

      // Create backup before migration
      await this.createMigrationBackup(key, loadedData);

      // Perform migration
      const migratedData = await this.migrationManager.migrate(
        loadedData,
        loadedData.version || "1.0.0",
        this.currentVersion
      );

      // Save migrated data
      await this.save(key, migratedData, { ...options, skipValidation: false });

      return migratedData;
    }

    return loadedData;
  }

  async createMigrationBackup(key, data) {
    const backupKey = `${key}_backup_${Date.now()}`;
    await super.save(backupKey, data, { compress: true });

    // Clean up old backups (keep only last 5)
    await this.cleanupOldBackups(key);
  }

  async cleanupOldBackups(key) {
    const backupPattern = `${key}_backup_`;
    const allKeys = await this.storage.getAllKeys();
    const backupKeys = allKeys
      .filter(k => k.startsWith(backupPattern))
      .sort()
      .reverse(); // Most recent first

    // Remove backups beyond the limit
    const backupsToRemove = backupKeys.slice(5);
    for (const backupKey of backupsToRemove) {
      await this.storage.removeItem(backupKey);
    }
  }
}
```

## Data Validation Schema

### Scripture Enhancement Validation
```javascript
const scriptureEnhancementSchema = {
  level: { type: 'number', min: 1, max: 10, required: true },
  currentXp: { type: 'number', min: 0, required: true },
  maxXp: { type: 'number', min: 1, required: true },
  isEvolved: { type: 'boolean', required: true },
  evolutionSource: { type: 'string', nullable: true }
};
```

### Event Data Validation
```javascript
const eventDataSchema = {
  participationHistory: { type: 'map', required: true },
  activeEventProgress: { type: 'map', required: true },
  eventStatistics: {
    type: 'object',
    properties: {
      eventsParticipated: { type: 'number', min: 0 },
      eventsCompleted: { type: 'number', min: 0 },
      totalEventRewards: { type: 'number', min: 0 }
    }
  }
};
```

## Migration Testing Strategy

### Unit Tests
- Test each migration script individually
- Validate data integrity before and after migration
- Test migration rollback functionality
- Test migration with corrupted data

### Integration Tests
- Test complete migration pipeline
- Test save/load with migrated data
- Test performance with large save files
- Test concurrent migration scenarios

### Stress Tests
- Test migration with maximum size save files
- Test migration performance under memory constraints
- Test migration with network interruptions
- Test multiple rapid save/load cycles post-migration

## Error Handling and Recovery

### Migration Failures
- Automatic rollback to backup on migration failure
- Detailed error logging for migration debugging
- Safe mode loading with minimal data
- Manual recovery tools for corrupted saves

### Data Corruption Detection
- Checksum validation for critical data sections
- Cross-reference validation between related data
- Automatic repair for common corruption patterns
- Quarantine system for severely corrupted data

## Performance Considerations
- Streaming migration for large save files
- Incremental migration to avoid blocking UI
- Memory-efficient migration algorithms
- Compression optimization for new data structures

## Success Metrics
- Migration success rate > 99.5%
- Migration performance < 5 seconds for typical saves
- Zero data loss during migration process
- Backward compatibility maintained for 2 previous versions
- Save file size increase < 20% with new features

## Security Considerations
- Validation of migrated data integrity
- Prevention of migration-based exploits
- Secure backup and recovery mechanisms
- Audit trail for all migration operations

## Dependencies
- Issue #1: Scripture Enhancement System (scripture data)
- Issue #3: Seasonal Event Framework (event data)
- Issue #5: PvP Tournament System (tournament data)
- Issue #7: Reward Integration (reward data)
- Existing SaveManager and MigrationManager

## Related Issues
- Issue #9: Balance and Testing (test migrated data balance)