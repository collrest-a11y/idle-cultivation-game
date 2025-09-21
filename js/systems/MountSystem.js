/**
 * MountSystem - Cultivation mount/companion system for CP progression
 * Provides mounts that contribute significantly to combat power (8-12% of total CP)
 */
class MountSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Initialize mount system state
        this.initializeState();

        console.log('MountSystem: Initialized');
    }

    /**
     * Initialize mount system state in game state
     */
    initializeState() {
        if (!this.gameState.get('mounts')) {
            this.gameState.set('mounts', {
                discovered: [],
                active: null,
                training: null,
                inventory: {},
                experience: {},
                unlocked: false
            });
        }
    }

    /**
     * Unlock the mount system (typically at Foundation Establishment realm)
     */
    unlockSystem() {
        const mounts = this.gameState.get('mounts');
        mounts.unlocked = true;

        // Give starter mount
        this.discoverMount('spirit_horse');

        this.gameState.set('mounts', mounts);
        this.eventManager.emit('mountSystemUnlocked');

        console.log('MountSystem: System unlocked');
    }

    /**
     * Check if mount system is unlocked
     */
    isUnlocked() {
        const cultivation = this.gameState.get('cultivation');
        const realm = cultivation?.realm || 'Body Refinement';

        // Unlock at Foundation Establishment or higher
        const realms = ['Body Refinement', 'Qi Condensation', 'Foundation Establishment'];
        const realmIndex = realms.indexOf(realm);

        return realmIndex >= 2 || this.gameState.get('mounts')?.unlocked;
    }

    /**
     * Discover a new mount
     */
    discoverMount(mountId) {
        const mounts = this.gameState.get('mounts');
        const mountData = this.getMountData(mountId);

        if (!mountData) {
            console.warn(`MountSystem: Unknown mount ${mountId}`);
            return false;
        }

        if (!mounts.discovered.includes(mountId)) {
            mounts.discovered.push(mountId);
            mounts.inventory[mountId] = 1;
            mounts.experience[mountId] = 0;

            this.gameState.set('mounts', mounts);
            this.eventManager.emit('mountDiscovered', { mountId, mountData });

            console.log(`MountSystem: Discovered mount ${mountId}`);
            return true;
        }

        return false;
    }

    /**
     * Activate a mount for combat power bonus
     */
    activateMount(mountId) {
        const mounts = this.gameState.get('mounts');

        if (!mounts.discovered.includes(mountId)) {
            console.warn(`MountSystem: Mount ${mountId} not discovered`);
            return false;
        }

        const oldActive = mounts.active;
        mounts.active = mountId;

        this.gameState.set('mounts', mounts);
        this.eventManager.emit('mountActivated', { mountId, previousMount: oldActive });

        console.log(`MountSystem: Activated mount ${mountId}`);
        return true;
    }

    /**
     * Start training a mount to increase its level and power
     */
    startTraining(mountId) {
        const mounts = this.gameState.get('mounts');

        if (!mounts.discovered.includes(mountId)) {
            console.warn(`MountSystem: Mount ${mountId} not discovered`);
            return false;
        }

        mounts.training = {
            mountId: mountId,
            startTime: Date.now(),
            duration: this.getTrainingDuration(mountId)
        };

        this.gameState.set('mounts', mounts);
        this.eventManager.emit('mountTrainingStarted', { mountId });

        console.log(`MountSystem: Started training mount ${mountId}`);
        return true;
    }

    /**
     * Complete mount training and apply experience/level gains
     */
    completeTraining() {
        const mounts = this.gameState.get('mounts');

        if (!mounts.training) {
            return null;
        }

        const { mountId, startTime, duration } = mounts.training;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Training not complete
        }

        // Apply experience gain
        const expGain = this.calculateTrainingExperience(mountId);
        mounts.experience[mountId] = (mounts.experience[mountId] || 0) + expGain;

        // Clear training
        mounts.training = null;

        this.gameState.set('mounts', mounts);
        this.eventManager.emit('mountTrainingCompleted', { mountId, expGain });

        console.log(`MountSystem: Completed training for mount ${mountId}, gained ${expGain} exp`);
        return { mountId, expGain };
    }

    /**
     * Get current active mount's contribution to combat power
     */
    getActiveMountPower() {
        const mounts = this.gameState.get('mounts');

        if (!mounts?.active) {
            return 0;
        }

        const mountData = this.getMountData(mounts.active);
        const level = this.getMountLevel(mounts.active);
        const experience = mounts.experience[mounts.active] || 0;

        if (!mountData) {
            return 0;
        }

        // Base power + level scaling + experience bonus
        let power = mountData.basePower;
        power += level * mountData.powerPerLevel;
        power += Math.floor(experience / 100) * mountData.experienceBonus;

        return Math.floor(power);
    }

    /**
     * Get mount level based on experience
     */
    getMountLevel(mountId) {
        const experience = this.gameState.get('mounts')?.experience?.[mountId] || 0;
        const mountData = this.getMountData(mountId);

        if (!mountData) {
            return 1;
        }

        // Experience requirements increase with each level
        let level = 1;
        let expRequired = mountData.baseExpRequirement;
        let totalExp = 0;

        while (totalExp + expRequired <= experience) {
            totalExp += expRequired;
            level++;
            expRequired = Math.floor(expRequired * mountData.expGrowthRate);
        }

        return level;
    }

    /**
     * Get training duration for a mount
     */
    getTrainingDuration(mountId) {
        const mountData = this.getMountData(mountId);
        const level = this.getMountLevel(mountId);

        if (!mountData) {
            return 60000; // 1 minute default
        }

        // Training time increases with level
        return mountData.baseTrainingTime * Math.pow(1.1, level - 1);
    }

    /**
     * Calculate experience gained from training
     */
    calculateTrainingExperience(mountId) {
        const mountData = this.getMountData(mountId);
        const level = this.getMountLevel(mountId);

        if (!mountData) {
            return 10;
        }

        // Base experience with some randomness
        const baseExp = mountData.baseExpGain;
        const levelMultiplier = Math.max(1, level * 0.1);
        const randomFactor = 0.8 + Math.random() * 0.4; // 80-120% of base

        return Math.floor(baseExp * levelMultiplier * randomFactor);
    }

    /**
     * Get all discovered mounts with their current stats
     */
    getDiscoveredMounts() {
        const mounts = this.gameState.get('mounts');

        if (!mounts?.discovered) {
            return [];
        }

        return mounts.discovered.map(mountId => {
            const data = this.getMountData(mountId);
            const level = this.getMountLevel(mountId);
            const experience = mounts.experience[mountId] || 0;
            const power = this.calculateMountPower(mountId);

            return {
                id: mountId,
                ...data,
                level: level,
                experience: experience,
                power: power,
                isActive: mounts.active === mountId,
                isTraining: mounts.training?.mountId === mountId
            };
        });
    }

    /**
     * Calculate specific mount's power contribution
     */
    calculateMountPower(mountId) {
        const mountData = this.getMountData(mountId);
        const level = this.getMountLevel(mountId);
        const experience = this.gameState.get('mounts')?.experience?.[mountId] || 0;

        if (!mountData) {
            return 0;
        }

        let power = mountData.basePower;
        power += level * mountData.powerPerLevel;
        power += Math.floor(experience / 100) * mountData.experienceBonus;

        return Math.floor(power);
    }

    /**
     * Get mount data by ID
     */
    getMountData(mountId) {
        const mountsData = {
            spirit_horse: {
                name: 'Spirit Horse',
                description: 'A swift spiritual steed that enhances the rider\'s cultivation aura',
                rarity: 'Common',
                basePower: 150,
                powerPerLevel: 25,
                experienceBonus: 2,
                baseExpRequirement: 100,
                expGrowthRate: 1.5,
                baseTrainingTime: 120000, // 2 minutes
                baseExpGain: 20,
                unlockRequirement: 'Foundation Establishment',
                type: 'Beast',
                element: 'Wind'
            },

            cloud_leopard: {
                name: 'Cloud Leopard',
                description: 'An agile feline companion that moves like mist and strikes like lightning',
                rarity: 'Uncommon',
                basePower: 280,
                powerPerLevel: 45,
                experienceBonus: 3,
                baseExpRequirement: 200,
                expGrowthRate: 1.6,
                baseTrainingTime: 180000, // 3 minutes
                baseExpGain: 35,
                unlockRequirement: 'Core Formation',
                type: 'Beast',
                element: 'Lightning'
            },

            fire_phoenix: {
                name: 'Fire Phoenix',
                description: 'A legendary bird of rebirth that grants immense spiritual power',
                rarity: 'Rare',
                basePower: 450,
                powerPerLevel: 75,
                experienceBonus: 5,
                baseExpRequirement: 400,
                expGrowthRate: 1.7,
                baseTrainingTime: 300000, // 5 minutes
                baseExpGain: 60,
                unlockRequirement: 'Nascent Soul',
                type: 'Spirit Beast',
                element: 'Fire'
            },

            void_dragon: {
                name: 'Void Dragon',
                description: 'An ancient dragon that commands the power of emptiness itself',
                rarity: 'Legendary',
                basePower: 800,
                powerPerLevel: 120,
                experienceBonus: 8,
                baseExpRequirement: 800,
                expGrowthRate: 1.8,
                baseTrainingTime: 600000, // 10 minutes
                baseExpGain: 100,
                unlockRequirement: 'Soul Transformation',
                type: 'Dragon',
                element: 'Void'
            }
        };

        return mountsData[mountId] || null;
    }

    /**
     * Get mount system status for UI display
     */
    getSystemStatus() {
        const mounts = this.gameState.get('mounts');

        return {
            unlocked: this.isUnlocked(),
            activeMount: mounts?.active || null,
            activeMountPower: this.getActiveMountPower(),
            trainingInProgress: !!mounts?.training,
            trainingMount: mounts?.training?.mountId || null,
            trainingTimeRemaining: mounts?.training ?
                Math.max(0, (mounts.training.startTime + mounts.training.duration) - Date.now()) : 0,
            discoveredCount: mounts?.discovered?.length || 0,
            totalMounts: Object.keys(this.getMountData('spirit_horse') ? { spirit_horse: true, cloud_leopard: true, fire_phoenix: true, void_dragon: true } : {}).length
        };
    }

    /**
     * Process mount-related idle gains
     */
    processIdleGains(timeElapsed) {
        const mounts = this.gameState.get('mounts');

        if (!mounts?.training) {
            return;
        }

        // Check if training completed during idle time
        const training = mounts.training;
        const trainingEndTime = training.startTime + training.duration;
        const now = Date.now();

        if (now >= trainingEndTime) {
            // Training completed during idle time
            const result = this.completeTraining();
            if (result) {
                console.log(`MountSystem: Auto-completed training for ${result.mountId} during idle time`);
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MountSystem };
} else if (typeof window !== 'undefined') {
    window.MountSystem = MountSystem;
}