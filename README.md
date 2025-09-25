# Idle Cultivation - Ashes on the Wind

A complete idle/incremental RPG set in a wuxia/xianxia world where players cultivate Qi and Body, craft unique builds through Scripture collection, and collaborate in Sects. Features continuous progression without full resets and rotating seasonal content.

## 🎮 How to Play

### Getting Started
1. Open `index.html` in any modern web browser
2. Complete character creation by choosing your **Memory Fragments**:
   - **Origin**: Your background (affects starting bonuses)
   - **Vow**: Your motivation (determines special abilities)
   - **Mark of Fate**: Your cultivation affinity (influences scripture type)

### Core Game Loop

#### 1. **Cultivation** (Idle Progression)
- **Qi Path**: Ranged/skill-heavy cultivation with multiplicative scaling
- **Body Path**: Melee/flat damage with defense and lifesteal focus
- **Dual Path**: Hybrid cultivation (unlocks at Foundation Realm)

Your cultivation progresses automatically even when offline (up to 12 hours). Use **Meditate** for 2x speed boosts.

#### 2. **Scriptures** (Gacha Collection)
- Pull scriptures using **Jade** (premium currency) or **Spirit Crystals**
- **Rarities**: Common → Uncommon → Rare → Epic → **Legendary**
- **Pity System**: Guaranteed Legendary at 80 pulls, soft pity at 20
- **Equipment**: Drag scriptures to loadout slots for stat bonuses

#### 3. **Combat** (Asynchronous PvP)
- **Find Opponent**: Auto-matched duels based on power level
- **Practice Duels**: No consequences, practice your build
- **Ranked Matches**: Affects rank and gives premium rewards
- Combat is simulated in 30-second time-boxed encounters

#### 4. **Realm Progression**
- Advance through cultivation realms by reaching power thresholds
- **Breakthrough** when you have sufficient power
- Each realm unlocks new features and increases maximum potential

## 🏛️ Advanced Systems

### Sect System (Asynchronous Multiplayer)
- **Join Sects**: Find established sects or create your own (costs 1000 Spirit Crystals)
- **Sect Buffs**: Passive bonuses for all members (cultivation speed, combat power, etc.)
- **Rituals**: Collaborative goals that require member donations
- **Sect Market**: Special items purchasable with contribution points

### Quest System
- **Daily Quests**: 3 random tasks that reset every 24 hours
- **Weekly Quests**: 2 longer-term goals with better rewards
- **Achievements**: Permanent milestones with one-time rewards

### Memory Fragments (Character Creation)

#### Origins
- **Dust Road Orphan**: +Flat Body damage, lifesteal
- **Ink Pavilion Disciple**: +Qi multiplier, chi regeneration
- **Exiled Heir**: +Jade bonuses, shop discounts
- **Hermit of North Ridge**: +Dual cultivation progress

#### Vows
- **Protect the Small**: +Damage reduction after taking hits
- **Pursue Hidden Law**: +Critical chance after skill use
- **Break the Chain**: +Flat damage vs armored enemies
- **Settle a Debt**: +Resource bonuses from bosses

#### Marks of Fate
- **Thunder Whisper (Qi)**: +Opening burst damage, stun chance
- **Frostbrand Scar (Body)**: +True damage windows
- **Twin-Pulse Sigil (Dual)**: Qi↔Body cross-scaling
- **Hollow Gourd (Utility)**: +Shard gain for metaprogression

## 💎 Currency & Resources

### Primary Currencies
- **💎 Jade**: Premium currency for scripture pulls and skips
- **🔮 Spirit Crystals**: Soft currency for meditation, sect donations, crafting
- **⭐ Shards**: Metaprogression currency for permanent upgrades

### Progression Flow
1. **Idle cultivation** generates Spirit Crystals and levels
2. **Spirit Crystals** fund meditation, sect activities, and basic pulls
3. **Combat victories** earn Jade and Shards
4. **Jade** enables premium scripture pulls
5. **Shards** unlock permanent metaprogression nodes

## ⚔️ Combat Mechanics

### Stats Explained
- **Flat Damage**: Base damage added to attacks
- **Damage Multiplier**: Percentage boost to total damage
- **Attack Speed**: How fast you attack (affects DPS)
- **Critical Chance**: Probability of critical hits
- **Critical Multiplier**: Damage bonus on critical hits

### Combat Formula
```
DPS = (Base + Flat) × Multiplier × Attack Speed × Crit Factor
Final Damage per Attack = DPS / Attack Speed
```

### Path Balance
- **Qi**: Higher multipliers, lower flat damage (scales exponentially)
- **Body**: Higher flat damage, lower multipliers (reliable linear growth)
- **Dual**: Balanced but slower to start, highest ceiling with synergies

## 🌟 Tips for New Players

### Early Game (Body Refinement)
1. **Focus on one path** initially for faster progress
2. **Complete daily quests** for steady resource income
3. **Join a sect** as soon as possible for passive buffs
4. **Save Jade** for 10-pulls to maximize pity efficiency

### Mid Game (Qi Condensation → Foundation)
1. **Start experimenting** with Dual cultivation after Foundation unlock
2. **Participate in sect rituals** for rare scripture rewards
3. **Build towards breakthrough** requirements steadily
4. **Try ranked duels** once your power stabilizes

### Late Game (Core Formation+)
1. **Optimize scripture synergies** between different slots
2. **Lead or create** your own sect for maximum benefits
3. **Focus on metaprogression** with accumulated shards
4. **Plan builds** around specific combat advantages

## 🔄 Offline Progression

The game tracks your progress even when closed:
- **Maximum**: 12 hours of offline progression
- **Catch-up Pulse**: 2x gains for first 5 minutes after returning
- **Full simulation**: All cultivation, resource generation, and quest progress
- **Welcome back modal** shows exactly what you gained

## 📱 Mobile Friendly

The game is designed to work perfectly on phones:
- **Responsive layout** adapts to screen size
- **Touch-friendly buttons** and navigation
- **PWA-ready** (can be installed as an app)
- **Optimized for idle play** with meaningful short sessions

## 🎨 Immersive Wuxia Theme

### Setting: Reedvale Village
Your journey begins in a quiet village where you must keep a mysterious lantern lit through the night. This simple trial awakens your cultivation potential and sets you on the path to immortality.

### Progression Realms
1. **Body Refinement** (10 stages) - Strengthening your physical form
2. **Qi Condensation** (10 stages) - Gathering spiritual energy
3. **Foundation** (5 stages) - Laying groundwork for advanced cultivation
4. **Core Formation** (3 stages) - Forming your spiritual core
5. **Nascent Soul** (3 stages) - Birth of your immortal soul
6. **Soul Transformation** (1 stage) - Transcending mortal limits

## 🚀 Technical Features

### Bulletproof Loading System ✨
The game guarantees you **never see a blank page** through a multi-layered loading architecture:

#### Progressive Loading
- **3-Phase System**: Critical → UI → Enhancement
- **Smart Prioritization**: Essential systems load first (<2 seconds)
- **Visual Feedback**: Detailed loading progress with phase indicators
- **Performance Target**: Total load time <5 seconds

#### Reliability Guarantees
- ✅ **100% Character Creation**: Multiple fallback mechanisms ensure character creation always works
- ✅ **Safe Mode**: Automatic minimal game mode when normal loading fails
- ✅ **State Recovery**: Automatic detection and recovery from corrupted saves
- ✅ **File Protocol Support**: Works from `file://`, `localhost`, and production URLs
- ✅ **Error Recovery**: Comprehensive error handling with user-friendly messages

#### Safety Features
- **Failure Tracking**: Persistent tracking of initialization failures
- **Automatic Safe Mode**: Activates after 3 consecutive failures
- **Emergency Fallback**: Static recovery UI if all else fails
- **Recovery Options**: Clear guidance for resolving issues

📚 **Documentation**:
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - User-facing help
- [Loading Architecture](docs/LOADING_ARCHITECTURE.md) - Technical details

### Save System
- **Auto-save** every 30 seconds
- **Manual save** on major actions
- **Browser localStorage** for persistence
- **Save migration** for version updates
- **Corruption Detection**: Automatic validation and recovery
- **Backup System**: State recovery from multiple sources

### Performance
- **Efficient game loop** (1-second ticks)
- **Optimized calculations** for idle progression
- **Minimal battery drain** on mobile devices
- **Smooth animations** with CSS transitions
- **Load Time Monitoring**: Performance tracking and optimization

## 🎯 Game Philosophy

**Idle Cultivation** is designed around:
- **Meaningful Progression**: Every session should feel rewarding
- **No Pay-to-Win**: All premium currency can be earned through play
- **Respect Player Time**: Substantial offline progress and catch-up mechanics
- **Social Cooperation**: Sects provide benefits without requiring constant interaction
- **Strategic Depth**: Multiple viable build paths and meaningful choices

## 🔧 Development

Built with vanilla HTML5, CSS3, and JavaScript for maximum compatibility and performance. No frameworks required - just open and play!

### File Structure
```
idle-cultivation/
├── index.html      # Main game interface
├── styles.css      # All styling and responsive design
├── game.js         # Complete game logic and systems
└── README.md       # This guide
```

---

**Welcome to the path of cultivation. Your journey to immortality begins now...**

*Keep the lantern burning. Listen to the bell that has no temple. The way forward reveals itself to those who have patience.*