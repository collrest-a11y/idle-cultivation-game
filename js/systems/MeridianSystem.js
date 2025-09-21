/**
 * MeridianSystem - Meridian cultivation system for CP progression
 * Provides meridian channels that contribute significantly to combat power (7-10% of total CP)
 */
class MeridianSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Initialize meridian system state
        this.initializeState();

        console.log('MeridianSystem: Initialized');
    }

    /**
     * Initialize meridian system state in game state
     */
    initializeState() {
        if (!this.gameState.get('meridians')) {
            this.gameState.set('meridians', {
                channels: {},
                active: [],
                opening: null,
                resources: {},
                patterns: {},
                unlocked: false
            });
        }
    }

    /**
     * Unlock the meridian system (typically at Qi Condensation realm)
     */
    unlockSystem() {
        const meridians = this.gameState.get('meridians');
        meridians.unlocked = true;

        // Initialize basic meridian channels
        this.initializeBasicChannels();

        this.gameState.set('meridians', meridians);
        this.eventManager.emit('meridianSystemUnlocked');

        console.log('MeridianSystem: System unlocked');
    }

    /**
     * Initialize basic meridian channels
     */
    initializeBasicChannels() {
        const meridians = this.gameState.get('meridians');
        const basicChannels = [
            'hand_taiyin', 'hand_shaoyin', 'hand_jueyin',
            'hand_yangming', 'hand_taiyang', 'hand_shaoyang',
            'foot_taiyin', 'foot_shaoyin', 'foot_jueyin',
            'foot_yangming', 'foot_taiyang', 'foot_shaoyang'
        ];

        basicChannels.forEach(channelId => {
            if (!meridians.channels[channelId]) {
                meridians.channels[channelId] = {
                    id: channelId,
                    opened: false,
                    level: 0,
                    purity: 0,
                    blockages: 12, // Start with blockages that need clearing
                    maxBlockages: 12
                };
            }
        });

        this.gameState.set('meridians', meridians);
    }

    /**
     * Check if meridian system is unlocked
     */
    isUnlocked() {
        const cultivation = this.gameState.get('cultivation');
        const realm = cultivation?.realm || 'Body Refinement';

        // Unlock at Qi Condensation or higher
        const realms = ['Body Refinement', 'Qi Condensation'];
        const realmIndex = realms.indexOf(realm);

        return realmIndex >= 1 || this.gameState.get('meridians')?.unlocked;
    }

    /**
     * Start opening a meridian channel
     */
    startOpening(channelId) {
        const meridians = this.gameState.get('meridians');

        if (!meridians.channels[channelId]) {
            console.warn(`MeridianSystem: Unknown meridian channel ${channelId}`);
            return false;
        }

        const channel = meridians.channels[channelId];

        if (channel.opened) {
            console.warn(`MeridianSystem: Channel ${channelId} already opened`);
            return false;
        }

        if (channel.blockages <= 0) {
            // Can open the channel immediately
            return this.openChannel(channelId);
        }

        // Need to clear blockages first
        const requirements = this.getOpeningRequirements(channelId);

        if (!this.hasRequiredResources(requirements)) {
            console.warn(`MeridianSystem: Insufficient resources for opening ${channelId}`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        meridians.opening = {
            channelId: channelId,
            startTime: Date.now(),
            duration: this.getOpeningDuration(channelId),
            progress: 0
        };

        this.gameState.set('meridians', meridians);
        this.eventManager.emit('meridianOpeningStarted', { channelId });

        console.log(`MeridianSystem: Started opening meridian channel ${channelId}`);
        return true;
    }

    /**
     * Complete meridian channel opening
     */
    completeOpening() {
        const meridians = this.gameState.get('meridians');

        if (!meridians.opening) {
            return null;
        }

        const { channelId, startTime, duration } = meridians.opening;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Opening not complete
        }

        // Clear one blockage
        const channel = meridians.channels[channelId];
        if (channel && channel.blockages > 0) {
            channel.blockages -= 1;

            // If all blockages cleared, open the channel
            if (channel.blockages <= 0) {
                this.openChannel(channelId);
            }
        }

        // Clear opening process
        meridians.opening = null;

        this.gameState.set('meridians', meridians);
        this.eventManager.emit('meridianOpeningCompleted', { channelId, opened: channel.blockages <= 0 });

        console.log(`MeridianSystem: Completed opening process for ${channelId}, blockages remaining: ${channel.blockages}`);
        return { channelId, opened: channel.blockages <= 0 };
    }

    /**
     * Open a meridian channel
     */
    openChannel(channelId) {
        const meridians = this.gameState.get('meridians');
        const channel = meridians.channels[channelId];

        if (!channel) {
            return false;
        }

        channel.opened = true;
        channel.level = 1;
        channel.purity = 10;

        if (!meridians.active.includes(channelId)) {
            meridians.active.push(channelId);
        }

        this.gameState.set('meridians', meridians);
        this.eventManager.emit('meridianChannelOpened', { channelId });

        console.log(`MeridianSystem: Opened meridian channel ${channelId}`);
        return true;
    }

    /**
     * Cultivate a meridian channel to increase its level and purity
     */
    cultivateChannel(channelId) {
        const meridians = this.gameState.get('meridians');
        const channel = meridians.channels[channelId];

        if (!channel || !channel.opened) {
            console.warn(`MeridianSystem: Channel ${channelId} not opened`);
            return false;
        }

        const requirements = this.getCultivationRequirements(channelId);

        if (!this.hasRequiredResources(requirements)) {
            console.warn(`MeridianSystem: Insufficient resources for cultivation`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        // Increase level and purity
        const purityGain = 5 + Math.random() * 10; // 5-15 purity gain
        channel.purity += purityGain;

        // Level up if enough purity
        const purityRequired = this.getPurityRequiredForLevel(channel.level + 1);
        if (channel.purity >= purityRequired) {
            channel.level += 1;
            channel.purity = Math.max(0, channel.purity - purityRequired);
        }

        this.gameState.set('meridians', meridians);
        this.eventManager.emit('meridianChannelCultivated', { channelId, purityGain, newLevel: channel.level });

        console.log(`MeridianSystem: Cultivated channel ${channelId}, gained ${purityGain} purity`);
        return true;
    }

    /**
     * Activate a meridian pattern for enhanced power
     */
    activatePattern(patternId) {
        const meridians = this.gameState.get('meridians');
        const patternData = this.getPatternData(patternId);

        if (!patternData) {
            console.warn(`MeridianSystem: Unknown pattern ${patternId}`);
            return false;
        }

        // Check if required channels are opened and leveled
        const canActivate = patternData.requiredChannels.every(req => {
            const channel = meridians.channels[req.channelId];
            return channel && channel.opened && channel.level >= req.minLevel;
        });

        if (!canActivate) {
            console.warn(`MeridianSystem: Cannot activate pattern ${patternId}, requirements not met`);
            return false;
        }

        meridians.patterns[patternId] = {
            active: true,
            level: 1,
            activatedAt: Date.now()
        };

        this.gameState.set('meridians', meridians);
        this.eventManager.emit('meridianPatternActivated', { patternId });

        console.log(`MeridianSystem: Activated meridian pattern ${patternId}`);
        return true;
    }

    /**
     * Get total combat power from meridian system
     */
    getMeridianPower() {
        const meridians = this.gameState.get('meridians');

        if (!meridians?.channels) {
            return 0;
        }

        let totalPower = 0;

        // Power from opened channels
        Object.values(meridians.channels).forEach(channel => {
            if (channel.opened) {
                const channelData = this.getChannelData(channel.id);
                if (channelData) {
                    let power = channelData.basePower;
                    power += (channel.level - 1) * channelData.powerPerLevel;
                    power += Math.floor(channel.purity / 10) * channelData.purityBonus;
                    totalPower += power;
                }
            }
        });

        // Power from active patterns
        Object.entries(meridians.patterns || {}).forEach(([patternId, pattern]) => {
            if (pattern.active) {
                const patternData = this.getPatternData(patternId);
                if (patternData) {
                    totalPower += patternData.powerBonus * pattern.level;
                }
            }
        });

        return Math.floor(totalPower);
    }

    /**
     * Get opening requirements for a channel
     */
    getOpeningRequirements(channelId) {
        const channelData = this.getChannelData(channelId);
        const meridians = this.gameState.get('meridians');
        const channel = meridians.channels[channelId];

        if (!channelData || !channel) {
            return {};
        }

        const blockageMultiplier = Math.pow(1.2, 12 - channel.blockages);

        return {
            qi_essence: Math.floor(channelData.baseCost * blockageMultiplier),
            meridian_pills: Math.floor(channelData.pillCost * blockageMultiplier),
            spirit_stones: Math.floor(channelData.stoneCost * blockageMultiplier)
        };
    }

    /**
     * Get cultivation requirements for a channel
     */
    getCultivationRequirements(channelId) {
        const channelData = this.getChannelData(channelId);
        const meridians = this.gameState.get('meridians');
        const channel = meridians.channels[channelId];

        if (!channelData || !channel) {
            return {};
        }

        const levelMultiplier = Math.pow(1.3, channel.level - 1);

        return {
            qi_essence: Math.floor(20 * levelMultiplier),
            meridian_pills: Math.floor(2 * levelMultiplier),
            spirit_stones: Math.floor(10 * levelMultiplier)
        };
    }

    /**
     * Get opening duration for a channel
     */
    getOpeningDuration(channelId) {
        const channelData = this.getChannelData(channelId);

        if (!channelData) {
            return 300000; // 5 minutes default
        }

        return channelData.openingTime || 180000; // 3 minutes
    }

    /**
     * Get purity required for next level
     */
    getPurityRequiredForLevel(level) {
        return 50 * Math.pow(1.5, level - 1);
    }

    /**
     * Check if player has required resources
     */
    hasRequiredResources(requirements) {
        const meridians = this.gameState.get('meridians');

        for (const [resource, amount] of Object.entries(requirements)) {
            const available = meridians.resources[resource] || 0;
            if (available < amount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Consume resources
     */
    consumeResources(requirements) {
        const meridians = this.gameState.get('meridians');

        for (const [resource, amount] of Object.entries(requirements)) {
            meridians.resources[resource] = (meridians.resources[resource] || 0) - amount;
        }

        this.gameState.set('meridians', meridians);
    }

    /**
     * Add resources to inventory
     */
    addResources(resourceId, amount) {
        const meridians = this.gameState.get('meridians');
        meridians.resources[resourceId] = (meridians.resources[resourceId] || 0) + amount;

        this.gameState.set('meridians', meridians);
        this.eventManager.emit('meridianResourcesAdded', { resourceId, amount });
    }

    /**
     * Get channel data by ID
     */
    getChannelData(channelId) {
        const channelsData = {
            // Hand Channels (Arm Meridians)
            hand_taiyin: {
                name: 'Hand Taiyin (Lung Meridian)',
                description: 'Controls breathing and qi circulation',
                type: 'yin',
                element: 'Metal',
                basePower: 25,
                powerPerLevel: 8,
                purityBonus: 2,
                baseCost: 30,
                pillCost: 2,
                stoneCost: 15,
                openingTime: 120000
            },
            hand_shaoyin: {
                name: 'Hand Shaoyin (Heart Meridian)',
                description: 'Governs blood circulation and spirit',
                type: 'yin',
                element: 'Fire',
                basePower: 30,
                powerPerLevel: 10,
                purityBonus: 3,
                baseCost: 35,
                pillCost: 3,
                stoneCost: 18,
                openingTime: 150000
            },
            hand_jueyin: {
                name: 'Hand Jueyin (Pericardium Meridian)',
                description: 'Protects the heart and regulates emotions',
                type: 'yin',
                element: 'Fire',
                basePower: 35,
                powerPerLevel: 12,
                purityBonus: 4,
                baseCost: 40,
                pillCost: 4,
                stoneCost: 20,
                openingTime: 180000
            },
            hand_yangming: {
                name: 'Hand Yangming (Large Intestine Meridian)',
                description: 'Controls elimination and purification',
                type: 'yang',
                element: 'Metal',
                basePower: 28,
                powerPerLevel: 9,
                purityBonus: 2,
                baseCost: 32,
                pillCost: 3,
                stoneCost: 16,
                openingTime: 135000
            },
            hand_taiyang: {
                name: 'Hand Taiyang (Small Intestine Meridian)',
                description: 'Separates pure from impure',
                type: 'yang',
                element: 'Fire',
                basePower: 32,
                powerPerLevel: 11,
                purityBonus: 3,
                baseCost: 38,
                pillCost: 4,
                stoneCost: 19,
                openingTime: 165000
            },
            hand_shaoyang: {
                name: 'Hand Shaoyang (Triple Heater Meridian)',
                description: 'Regulates temperature and metabolism',
                type: 'yang',
                element: 'Fire',
                basePower: 38,
                powerPerLevel: 13,
                purityBonus: 4,
                baseCost: 45,
                pillCost: 5,
                stoneCost: 22,
                openingTime: 200000
            },

            // Foot Channels (Leg Meridians)
            foot_taiyin: {
                name: 'Foot Taiyin (Spleen Meridian)',
                description: 'Controls digestion and qi transformation',
                type: 'yin',
                element: 'Earth',
                basePower: 40,
                powerPerLevel: 14,
                purityBonus: 5,
                baseCost: 50,
                pillCost: 6,
                stoneCost: 25,
                openingTime: 220000
            },
            foot_shaoyin: {
                name: 'Foot Shaoyin (Kidney Meridian)',
                description: 'Stores essence and controls reproduction',
                type: 'yin',
                element: 'Water',
                basePower: 45,
                powerPerLevel: 16,
                purityBonus: 6,
                baseCost: 60,
                pillCost: 8,
                stoneCost: 30,
                openingTime: 260000
            },
            foot_jueyin: {
                name: 'Foot Jueyin (Liver Meridian)',
                description: 'Smooths qi flow and stores blood',
                type: 'yin',
                element: 'Wood',
                basePower: 42,
                powerPerLevel: 15,
                purityBonus: 5,
                baseCost: 55,
                pillCost: 7,
                stoneCost: 28,
                openingTime: 240000
            },
            foot_yangming: {
                name: 'Foot Yangming (Stomach Meridian)',
                description: 'Receives and processes food qi',
                type: 'yang',
                element: 'Earth',
                basePower: 35,
                powerPerLevel: 12,
                purityBonus: 4,
                baseCost: 42,
                pillCost: 5,
                stoneCost: 21,
                openingTime: 190000
            },
            foot_taiyang: {
                name: 'Foot Taiyang (Bladder Meridian)',
                description: 'Longest meridian, controls fluid metabolism',
                type: 'yang',
                element: 'Water',
                basePower: 50,
                powerPerLevel: 18,
                purityBonus: 7,
                baseCost: 70,
                pillCost: 10,
                stoneCost: 35,
                openingTime: 300000
            },
            foot_shaoyang: {
                name: 'Foot Shaoyang (Gallbladder Meridian)',
                description: 'Makes decisions and controls courage',
                type: 'yang',
                element: 'Wood',
                basePower: 48,
                powerPerLevel: 17,
                purityBonus: 6,
                baseCost: 65,
                pillCost: 9,
                stoneCost: 32,
                openingTime: 280000
            }
        };

        return channelsData[channelId] || null;
    }

    /**
     * Get pattern data by ID
     */
    getPatternData(patternId) {
        const patternsData = {
            five_element_cycle: {
                name: 'Five Element Cycle',
                description: 'Harmonizes the five elements within the body',
                powerBonus: 100,
                requiredChannels: [
                    { channelId: 'hand_taiyin', minLevel: 3 },  // Metal
                    { channelId: 'hand_shaoyin', minLevel: 3 }, // Fire
                    { channelId: 'foot_taiyin', minLevel: 3 },  // Earth
                    { channelId: 'foot_shaoyin', minLevel: 3 }, // Water
                    { channelId: 'foot_jueyin', minLevel: 3 }   // Wood
                ],
                element: 'All',
                difficulty: 'Advanced'
            },

            yin_yang_balance: {
                name: 'Yin Yang Balance',
                description: 'Perfect balance between yin and yang energies',
                powerBonus: 150,
                requiredChannels: [
                    { channelId: 'hand_taiyin', minLevel: 5 },
                    { channelId: 'hand_shaoyin', minLevel: 5 },
                    { channelId: 'hand_jueyin', minLevel: 5 },
                    { channelId: 'hand_yangming', minLevel: 5 },
                    { channelId: 'hand_taiyang', minLevel: 5 },
                    { channelId: 'hand_shaoyang', minLevel: 5 }
                ],
                element: 'Neutral',
                difficulty: 'Master'
            },

            grand_circulation: {
                name: 'Grand Circulation',
                description: 'Complete circulation through all twelve main meridians',
                powerBonus: 300,
                requiredChannels: [
                    { channelId: 'hand_taiyin', minLevel: 8 },
                    { channelId: 'hand_shaoyin', minLevel: 8 },
                    { channelId: 'hand_jueyin', minLevel: 8 },
                    { channelId: 'hand_yangming', minLevel: 8 },
                    { channelId: 'hand_taiyang', minLevel: 8 },
                    { channelId: 'hand_shaoyang', minLevel: 8 },
                    { channelId: 'foot_taiyin', minLevel: 8 },
                    { channelId: 'foot_shaoyin', minLevel: 8 },
                    { channelId: 'foot_jueyin', minLevel: 8 },
                    { channelId: 'foot_yangming', minLevel: 8 },
                    { channelId: 'foot_taiyang', minLevel: 8 },
                    { channelId: 'foot_shaoyang', minLevel: 8 }
                ],
                element: 'Transcendent',
                difficulty: 'Legendary'
            }
        };

        return patternsData[patternId] || null;
    }

    /**
     * Get all channels with their current status
     */
    getAllChannels() {
        const meridians = this.gameState.get('meridians');

        if (!meridians?.channels) {
            return [];
        }

        return Object.keys(meridians.channels).map(channelId => {
            const channel = meridians.channels[channelId];
            const data = this.getChannelData(channelId);
            const power = channel.opened ? this.calculateChannelPower(channelId) : 0;

            return {
                id: channelId,
                ...data,
                ...channel,
                power: power,
                isOpening: meridians.opening?.channelId === channelId,
                openingRequirements: this.getOpeningRequirements(channelId),
                cultivationRequirements: this.getCultivationRequirements(channelId),
                canOpen: !channel.opened && this.hasRequiredResources(this.getOpeningRequirements(channelId)),
                canCultivate: channel.opened && this.hasRequiredResources(this.getCultivationRequirements(channelId))
            };
        });
    }

    /**
     * Calculate specific channel's power contribution
     */
    calculateChannelPower(channelId) {
        const meridians = this.gameState.get('meridians');
        const channel = meridians.channels[channelId];
        const channelData = this.getChannelData(channelId);

        if (!channel || !channel.opened || !channelData) {
            return 0;
        }

        let power = channelData.basePower;
        power += (channel.level - 1) * channelData.powerPerLevel;
        power += Math.floor(channel.purity / 10) * channelData.purityBonus;

        return Math.floor(power);
    }

    /**
     * Get meridian system status for UI display
     */
    getSystemStatus() {
        const meridians = this.gameState.get('meridians');

        return {
            unlocked: this.isUnlocked(),
            totalPower: this.getMeridianPower(),
            openingInProgress: !!meridians?.opening,
            openingChannel: meridians?.opening?.channelId || null,
            openingTimeRemaining: meridians?.opening ?
                Math.max(0, (meridians.opening.startTime + meridians.opening.duration) - Date.now()) : 0,
            openedChannels: meridians?.active?.length || 0,
            totalChannels: Object.keys(meridians?.channels || {}).length,
            activePatterns: Object.keys(meridians?.patterns || {}).filter(p => meridians.patterns[p].active).length,
            resources: meridians?.resources || {}
        };
    }

    /**
     * Process meridian-related idle gains
     */
    processIdleGains(timeElapsed) {
        const meridians = this.gameState.get('meridians');

        if (!meridians?.opening) {
            return;
        }

        // Check if opening completed during idle time
        const opening = meridians.opening;
        const openingEndTime = opening.startTime + opening.duration;
        const now = Date.now();

        if (now >= openingEndTime) {
            // Opening completed during idle time
            const result = this.completeOpening();
            if (result) {
                console.log(`MeridianSystem: Auto-completed opening for ${result.channelId} during idle time`);
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MeridianSystem };
} else if (typeof window !== 'undefined') {
    window.MeridianSystem = MeridianSystem;
}