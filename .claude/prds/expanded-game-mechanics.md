---
name: Expanded-Game-Mechanics
description: Comprehensive analysis and expansion of idle cultivation game mechanics
status: draft
created: 2025-09-17T00:00:00.000Z
updated: 2025-09-17T00:00:00.000Z
---

# Expanded Game Mechanics: Idle Cultivation Game

## Current Game Systems Analysis

Based on the existing codebase, the game implements a sophisticated idle cultivation system with the following core mechanics:

## 1. Character Creation & Narrative Framework

### Memory Fragment System
The game uses a unique narrative-driven character creation system where players choose three defining aspects:

#### **Origin Stories** (Background Modifiers)
- **Dust Road Orphan**: Combat-focused (+5 flat damage, +2% lifesteal, special: 10% bleed chance)
- **Ink Pavilion Disciple**: Study-focused (+10% damage multiplier, +20% qi rate, special: critical hits restore mana)
- **Exiled Heir**: Resource-focused (+10% jade bonus, +5% shop discount, special: +10 pity bonus)
- **Hermit**: Balance-focused (+10% dual progress, -10% attack speed, special: dual synergy bonus)

#### **Vows** (Philosophy Modifiers)
- **Protect the Small**: Defensive (+5% damage reduction, special: guard break resistance)
- **Pursue the Hidden Law**: Critical-focused (+3% critical chance, special: skill critical bonus)
- **Break the Chain**: Penetration-focused (+10% armor penetration, special: shield breaker)
- **Settle a Debt**: Resource-focused (+15% resource bonus, special: boss reward bonus)

#### **Mark of Fate** (Cultivation Path Affinity)
- **Thunder Whisper (Qi)**: Speed & precision (+50% first strike multiplier, +2% stun chance)
- **Frostbrand Scar (Body)**: Damage & control (+3 true damage, +10% slow chance)
- **Twin-Pulse Sigil (Dual)**: Synergy-focused (+10% cross-scaling, +10% attack speed)
- **Hollow Gourd (Utility)**: Resource generation (+10% shard gain, special: on-hit shards)

### Rarity System for Character Traits
Each choice has a **rarity roll** that multiplies base modifiers, adding replayability and progression variance.

---

## 2. Cultivation System (Core Idle Mechanics)

### **Three-Path Cultivation System**

#### **Qi Cultivation Path**
```javascript
qi: {
    level: 0,                    // Current cultivation level
    experience: 0,               // Current progress
    experienceRequired: 100,     // Experience needed for next level
    baseRate: 1.0,               // Base cultivation speed
    multiplier: 1.0              // Modified by equipment/buffs
}
```

- **Progression**: Exponential scaling (1.2x experience requirement per level)
- **Speed Scaling**: 5% base rate increase per level
- **Focus**: Damage multipliers, critical stats, elemental effects

#### **Body Cultivation Path**
```javascript
body: {
    level: 0,
    experience: 0,
    experienceRequired: 100,
    baseRate: 1.0,
    multiplier: 1.0
}
```

- **Progression**: Same scaling as Qi
- **Focus**: Flat damage, lifesteal, damage reduction, health

#### **Dual Cultivation Path** (Unlocked at Foundation Realm)
```javascript
dual: {
    level: 0,
    experience: 0,
    experienceRequired: 200,     // Higher requirement
    baseRate: 0.5,               // Slower but more powerful
    multiplier: 1.0,
    unlocked: false
}
```

- **Synergy System**: Combines benefits of both Qi and Body
- **Higher Requirements**: 2x experience cost but greater rewards
- **Balanced Stats**: Provides both damage multiplier and flat damage

### **Offline Progress Calculation**
```javascript
calculateOfflineProgress(timeSeconds) {
    const maxOfflineTime = 12 * 60 * 60 * 1000; // 12 hour cap
    const effectiveTime = Math.min(timeSeconds, maxOfflineTime);

    // Simulate cultivation in 1-minute chunks to avoid infinite loops
    // Applies all active bonuses and multipliers
    // Provides detailed progress report on return
}
```

### **Meditation System**
- **Cost**: 50 Spirit Crystals
- **Effect**: 2x cultivation speed for 5 minutes
- **Strategic Use**: Timing-based resource optimization

---

## 3. Scripture Collection System (Gacha Mechanics)

### **Rarity Tiers & Drop Rates**
```javascript
const baseRates = [55, 25, 12, 6, 2]; // Common, Uncommon, Rare, Epic, Legendary
```

| Rarity | Rate | Multiplier | Max Level |
|--------|------|------------|-----------|
| Common (1★) | 55% | 1.0x | 10 |
| Uncommon (2★) | 25% | 1.2x | 20 |
| Rare (3★) | 12% | 1.5x | 30 |
| Epic (4★) | 6% | 2.0x | 40 |
| Legendary (5★) | 2% | 3.0x | 50 |

### **Pity System**
- **Soft Pity**: 20 pulls (doubles legendary rate)
- **Hard Pity**: 80 pulls (guaranteed legendary)
- **Counter Reset**: Only on legendary acquisition

### **Scripture Types & Templates**

#### **Qi Scriptures** (30% weight)
- **Basic Qi Circulation** (Common): +10% damage multiplier
- **Thunder Palm Technique** (Uncommon): +15% damage multiplier, +2% critical chance
- **Celestial Sword Art** (Epic): +30% damage multiplier, +5% critical chance, +20% critical multiplier
- **Divine Lightning Scripture** (Legendary): +50% damage multiplier, +10% critical chance, +20% attack speed

#### **Body Scriptures** (30% weight)
- **Iron Skin Training** (Common): +5 flat damage, +2% damage reduction
- **Stone Fist Manual** (Uncommon): +8 flat damage, +3% lifesteal
- **Diamond Body Scripture** (Epic): +15 flat damage, +10% damage reduction, +5% lifesteal
- **Immortal Physique Art** (Legendary): +25 flat damage, +15% damage reduction, +10% lifesteal

#### **Dual Scriptures** (25% weight) - Requires Foundation Realm
- **Harmony Breathing** (Uncommon): +8% damage multiplier, +4 flat damage
- **Yin-Yang Cultivation** (Rare): +12% damage multiplier, +6 flat damage, +5% attack speed
- **Primordial Unity Scripture** (Legendary): +20% damage multiplier, +12 flat damage, +10% attack speed, +5% critical chance

#### **Utility Scriptures** (15% weight)
- **Meditation Scroll** (Common): +5% shard gain
- **Treasure Finding Art** (Uncommon): +10% resource bonus, +3% shard gain
- **Cosmic Insight Manual** (Epic): +20% resource bonus, +10% shard gain, +15% experience bonus

### **Duplicate System**
- **Shard Conversion**: Duplicates convert to shards (rarity × 10)
- **Enhancement Material**: Future enhancement system foundation

---

## 4. Loadout & Equipment System

### **Five-Slot Equipment System**
```javascript
loadout: {
    slots: {
        qi: null,        // Qi-focused scripture slot
        body: null,      // Body-focused scripture slot
        dual: null,      // Dual cultivation slot (unlocked at Foundation)
        extra1: null,    // Any scripture type
        extra2: null     // Any scripture type
    }
}
```

### **Combat Statistics Calculation**
```javascript
stats: {
    flatDamage: 0,           // Added to base damage
    damageMultiplier: 1.0,   // Multiplies total damage
    attackSpeed: 1.0,        // Combat frequency multiplier
    critChance: 0.05,        // 5% base critical chance
    critMultiplier: 2.0,     // Critical damage multiplier
    lifesteal: 0,            // % damage converted to healing
    damageReduction: 0,      // % damage mitigation
    armorPen: 0,            // % armor penetration
    shardGain: 0,           // Bonus resource generation
    resourceBonus: 0        // % bonus to all resource gains
}
```

### **Power Calculation Formula**
```javascript
calculateTotalPower() {
    const baseDPS = (10 + flatDamage) * damageMultiplier * attackSpeed;
    const critFactor = 1 + (critChance * (critMultiplier - 1));
    return baseDPS * critFactor;
}
```

---

## 5. Combat & Dueling System

### **Turn-Based Combat Simulation**
```javascript
simulateCombat(playerStats, opponentStats) {
    let playerHP = 100 + (playerStats.flatDamage * 2);
    let opponentHP = opponentStats.hp || 100;
    const maxRounds = 30; // 30-second combat limit

    // Alternating attacks until victory/defeat/timeout
    // Damage calculation includes critical hits and variance
    // Detailed combat log for replay analysis
}
```

### **Opponent Generation System**
- **Power Matching**: Opponents within ±20% power variance
- **Stat Distribution**: Balanced generation ensuring fair matchups
- **Naming System**: Thematic wuxia-style opponent names

### **Combat Types**
1. **Casual Duels**: No rank impact, standard rewards
2. **Practice Duels**: No consequences, training dummy opponents
3. **Ranked Duels**: Affects ranking, enhanced rewards

### **Ranking System**
- **Starting Rank**: 1000
- **Victory Rewards**: -10 rank (climb up)
- **Defeat Penalties**: +5 rank (fall down)
- **Rank-Based Matching**: ±200 rank variance

### **Reward Structure**
```javascript
calculateDuelRewards(result, type, opponent) {
    const baseReward = { spiritCrystals: 10, shards: 1, jade: 0 };

    if (victory) baseReward *= 2;
    if (ranked) baseReward *= 1.5;

    // Streak multiplier: 1 + (streak * 0.1)
    // Additional jade for ranked victories
}
```

---

## 6. Sect/Guild System

### **Collaborative Mechanics**

#### **Sect Buffs** (Passive Benefits)
- **Cultivation Speed**: +10% cultivation rate
- **Combat Power**: +5% damage multiplier
- **Resource Gathering**: +15% spirit crystal gain
- **Critical Focus**: +2% critical chance
- **Breakthrough Insight**: -10% breakthrough requirements

#### **Sect Rituals** (Collective Goals)
```javascript
rituals: [
    {
        name: "Ritual of Harmony",
        description: "Collective meditation to boost cultivation",
        cost: 500,                    // Individual contribution
        target: 5000,                 // Total sect requirement
        reward: "+20% cultivation for 24 hours",
        timeLeft: 24 * 60 * 60 * 1000
    }
]
```

### **Sect Creation & Management**
- **Creation Cost**: 1000 Spirit Crystals
- **Member Capacity**: 50 players
- **Leadership System**: Founder becomes initial leader
- **Contribution Tracking**: Individual donation tracking

### **Sect Benefits**
- **Collective Rituals**: Group activities with shared rewards
- **Passive Buffs**: Permanent bonuses while member
- **Social Features**: Guild chat and coordination

---

## 7. Realm Progression System

### **Traditional Cultivation Realms**
```javascript
const realmProgression = [
    { name: "Body Refinement", stages: 10 },
    { name: "Qi Condensation", stages: 10 },
    { name: "Foundation", stages: 5 },
    { name: "Core Formation", stages: 3 },
    { name: "Nascent Soul", stages: 3 },
    { name: "Soul Transformation", stages: 1 }
];
```

### **Breakthrough System**
- **Power Requirements**: Exponential scaling (base × 1.5^stage)
- **Stage Progression**: Within-realm advancement
- **Realm Advancement**: Major progression with feature unlocks

### **Feature Unlocks**
- **Foundation Realm**: Dual Cultivation path unlocked
- **Core Formation**: Advanced sect features
- **Nascent Soul**: Meta-progression systems
- **Soul Transformation**: Endgame content

---

## 8. Quest & Achievement System

### **Daily Quests** (3 random selections)
- **Dedicated Cultivation**: Cultivate for 10 minutes
- **Prove Your Strength**: Win 3 duels
- **Seek Knowledge**: Pull 5 scriptures
- **Sect Contribution**: Donate 200 Spirit Crystals

### **Weekly Quests** (2 selections)
- **Ascension Path**: Reach the next realm
- **Unstoppable Force**: Achieve 10 win streak
- **Legendary Seeker**: Obtain Legendary scripture
- **Power Cultivation**: Reach specific power threshold

### **Achievements** (Permanent Goals)
- **First Victory**: Win first duel
- **Battle Master**: Win 100 duels
- **Foundation Seeker**: Reach Foundation Realm
- **Sect Master**: Create own sect

### **Dynamic Quest Updates**
```javascript
updateQuestProgress(type, amount = 1) {
    // Automatically tracks player actions
    // Updates progress across daily/weekly/achievement quests
    // Provides immediate feedback and completion rewards
}
```

---

## 9. Resource Economy

### **Three-Currency System**

#### **Jade** (Premium Currency)
- **Sources**: Real money, ranked victories, quest rewards
- **Uses**: Gacha pulls, premium purchases
- **Starting Amount**: 500

#### **Spirit Crystals** (Soft Currency)
- **Sources**: Idle generation, combat victories, quests
- **Uses**: Meditation, sect creation, shop purchases
- **Generation Rate**: 1.0/second base + bonuses

#### **Shards** (Meta-progression Currency)
- **Sources**: Duplicate scriptures, cultivation progress, achievements
- **Uses**: Meta-progression upgrades, rare purchases
- **Accumulation**: Slower, long-term progression

### **Idle Resource Generation**
```javascript
processIdleRewards(deltaTime) {
    const baseRate = 1.0;
    const bonusRate = this.gameState.loadout.stats.resourceBonus || 0;
    const crystalGain = (baseRate * (1 + bonusRate)) * deltaTime;

    // Additional shard generation from cultivation
    const shardRate = this.gameState.loadout.stats.shardGain || 0;
    const shardGain = shardRate * deltaTime;
}
```

---

## 10. Persistence & Progression Systems

### **Save System**
- **Auto-save**: Every 30 seconds
- **Local Storage**: JSON serialization
- **Migration Support**: Version compatibility
- **Backup Recovery**: Error handling and data validation

### **Offline Progress**
- **12-Hour Cap**: Maximum offline benefit period
- **Chunk Processing**: 1-minute simulation intervals
- **Detailed Reports**: Progress breakdown on return
- **Bonus Application**: All active multipliers included

### **Meta-progression Framework**
```javascript
metaProgression: {
    unlockedNodes: [],      // Permanent upgrades unlocked
    availablePoints: 0      // Points to spend on upgrades
}
```

---

## 11. User Interface & Experience

### **Girls' Frontline Aesthetic**
- **Dark Theme**: Military-inspired color scheme
- **Card-Based Layout**: Modular information display
- **Progress Bars**: Visual cultivation advancement
- **Modal System**: Overlay interactions

### **Navigation System**
- **Tab-Based**: Five main sections (Cultivation, Loadout, Scriptures, Combat, Sect)
- **Mobile-Friendly**: Touch-optimized bottom navigation
- **State Persistence**: Maintains context between sessions

### **Feedback Systems**
- **Message Display**: Temporary notifications
- **Progress Animations**: Visual cultivation advancement
- **Result Modals**: Gacha results, combat outcomes
- **Achievement Notifications**: Goal completion alerts

---

## 12. Technical Architecture

### **Single-File Design**
- **Monolithic Structure**: All game logic in `game.js`
- **Event-Driven**: User interaction handling
- **Real-Time Loop**: 1-second tick rate for updates
- **State Management**: Centralized game state object

### **Performance Considerations**
- **Chunked Calculations**: Prevents infinite loops in offline calculations
- **Efficient Updates**: Only update UI when necessary
- **Memory Management**: Clean object references
- **Error Handling**: Graceful degradation on failures

---

## Expansion Opportunities

### **Enhanced Systems**
1. **Equipment Enhancement**: Scripture leveling and evolution
2. **Seasonal Events**: Limited-time content and rewards
3. **PvP Tournaments**: Ranked competitions with exclusive rewards
4. **Alliance Wars**: Sect vs sect competition
5. **Prestige System**: Long-term meta-progression
6. **Artifact System**: Rare equipment with unique effects
7. **Formation System**: Strategic combat positioning
8. **Pet/Companion System**: Cultivation assistants

### **Social Features**
1. **Real-Time Chat**: Sect communication
2. **Leaderboards**: Global and sect rankings
3. **Mentorship System**: Veteran player guidance
4. **Trading System**: Resource and scripture exchange

### **Content Expansion**
1. **Story Mode**: Narrative progression system
2. **Dungeon System**: Instanced PvE content
3. **World Events**: Server-wide collaborative goals
4. **Exploration System**: Map-based progression
5. **Crafting System**: Resource transformation mechanics

This expanded mechanics document provides a comprehensive foundation for understanding the current game systems and planning future development priorities.