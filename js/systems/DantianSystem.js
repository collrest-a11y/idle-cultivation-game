/**
 * DantianSystem - Dantian cultivation system for CP progression
 * Provides dantian development that contributes significantly to combat power (8-12% of total CP)
 */
class DantianSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Initialize dantian system state
        this.initializeState();

        console.log('DantianSystem: Initialized');
    }

    /**
     * Initialize dantian system state in game state
     */
    initializeState() {
        if (!this.gameState.get('dantian')) {
            this.gameState.set('dantian', {
                centers: {
                    lower: { opened: false, level: 0, capacity: 0, purity: 0, density: 1.0 },
                    middle: { opened: false, level: 0, capacity: 0, purity: 0, density: 1.0 },
                    upper: { opened: false, level: 0, capacity: 0, purity: 0, density: 1.0 }
                },
                expanding: null,
                compressing: null,
                resources: {},
                formations: {},
                unlocked: false
            });
        }
    }

    /**
     * Unlock the dantian system (typically at Foundation Establishment realm)
     */
    unlockSystem() {
        const dantian = this.gameState.get('dantian');
        dantian.unlocked = true;

        // Open lower dantian by default
        this.openDantian('lower');

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianSystemUnlocked');

        console.log('DantianSystem: System unlocked');
    }

    /**
     * Check if dantian system is unlocked
     */
    isUnlocked() {
        const cultivation = this.gameState.get('cultivation');
        const realm = cultivation?.realm || 'Body Refinement';

        // Unlock at Foundation Establishment or higher
        const realms = ['Body Refinement', 'Qi Condensation', 'Foundation Establishment'];
        const realmIndex = realms.indexOf(realm);

        return realmIndex >= 2 || this.gameState.get('dantian')?.unlocked;
    }

    /**
     * Open a dantian center
     */
    openDantian(centerType) {
        const dantian = this.gameState.get('dantian');
        const center = dantian.centers[centerType];

        if (!center) {
            console.warn(`DantianSystem: Unknown dantian center ${centerType}`);
            return false;
        }

        if (center.opened) {
            console.warn(`DantianSystem: Dantian center ${centerType} already opened`);
            return false;
        }

        // Check prerequisites
        const prerequisites = this.getOpeningPrerequisites(centerType);
        if (!this.checkPrerequisites(prerequisites)) {
            console.warn(`DantianSystem: Prerequisites not met for opening ${centerType} dantian`);
            return false;
        }

        center.opened = true;
        center.level = 1;
        center.capacity = this.getBaseDantianCapacity(centerType);
        center.purity = 10;

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianOpened', { centerType });

        console.log(`DantianSystem: Opened ${centerType} dantian`);
        return true;
    }

    /**
     * Start expanding a dantian center to increase capacity
     */
    startExpansion(centerType) {
        const dantian = this.gameState.get('dantian');
        const center = dantian.centers[centerType];

        if (!center || !center.opened) {
            console.warn(`DantianSystem: Dantian center ${centerType} not opened`);
            return false;
        }

        const requirements = this.getExpansionRequirements(centerType);

        if (!this.hasRequiredResources(requirements)) {
            console.warn(`DantianSystem: Insufficient resources for expansion`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        dantian.expanding = {
            centerType: centerType,
            targetLevel: center.level + 1,
            startTime: Date.now(),
            duration: this.getExpansionDuration(centerType, center.level)
        };

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianExpansionStarted', { centerType, targetLevel: center.level + 1 });

        console.log(`DantianSystem: Started expanding ${centerType} dantian to level ${center.level + 1}`);
        return true;
    }

    /**
     * Complete dantian expansion
     */
    completeExpansion() {
        const dantian = this.gameState.get('dantian');

        if (!dantian.expanding) {
            return null;
        }

        const { centerType, targetLevel, startTime, duration } = dantian.expanding;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Expansion not complete
        }

        // Apply expansion
        const center = dantian.centers[centerType];
        if (center) {
            center.level = targetLevel;
            center.capacity = this.calculateDantianCapacity(centerType, targetLevel);
        }

        // Clear expanding
        dantian.expanding = null;

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianExpansionCompleted', { centerType, newLevel: targetLevel });

        console.log(`DantianSystem: Completed expansion of ${centerType} dantian to level ${targetLevel}`);
        return { centerType, newLevel: targetLevel };
    }

    /**
     * Start compressing qi in dantian to increase density and power
     */
    startCompression(centerType) {
        const dantian = this.gameState.get('dantian');
        const center = dantian.centers[centerType];

        if (!center || !center.opened) {
            console.warn(`DantianSystem: Dantian center ${centerType} not opened`);
            return false;
        }

        const requirements = this.getCompressionRequirements(centerType);

        if (!this.hasRequiredResources(requirements)) {
            console.warn(`DantianSystem: Insufficient resources for compression`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        dantian.compressing = {
            centerType: centerType,
            startTime: Date.now(),
            duration: this.getCompressionDuration(centerType)
        };

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianCompressionStarted', { centerType });

        console.log(`DantianSystem: Started compressing qi in ${centerType} dantian`);
        return true;
    }

    /**
     * Complete qi compression
     */
    completeCompression() {
        const dantian = this.gameState.get('dantian');

        if (!dantian.compressing) {
            return null;
        }

        const { centerType, startTime, duration } = dantian.compressing;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Compression not complete
        }

        // Apply compression effects
        const center = dantian.centers[centerType];
        if (center) {
            center.density += 0.1 + Math.random() * 0.1; // 0.1-0.2 density increase
            center.purity += 5 + Math.random() * 10; // 5-15 purity increase
        }

        // Clear compressing
        dantian.compressing = null;

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianCompressionCompleted', {
            centerType,
            newDensity: center.density,
            newPurity: center.purity
        });

        console.log(`DantianSystem: Completed compression of ${centerType} dantian`);
        return { centerType, newDensity: center.density, newPurity: center.purity };
    }

    /**
     * Create a qi formation in dantian for enhanced power
     */
    createFormation(centerType, formationId) {
        const dantian = this.gameState.get('dantian');
        const center = dantian.centers[centerType];
        const formationData = this.getFormationData(formationId);

        if (!center || !center.opened) {
            console.warn(`DantianSystem: Dantian center ${centerType} not opened`);
            return false;
        }

        if (!formationData) {
            console.warn(`DantianSystem: Unknown formation ${formationId}`);
            return false;
        }

        // Check requirements
        if (center.level < formationData.minLevel || center.purity < formationData.minPurity) {
            console.warn(`DantianSystem: Requirements not met for formation ${formationId}`);
            return false;
        }

        const requirements = formationData.requirements;
        if (!this.hasRequiredResources(requirements)) {
            console.warn(`DantianSystem: Insufficient resources for formation`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        // Create formation
        if (!dantian.formations[centerType]) {
            dantian.formations[centerType] = {};
        }

        dantian.formations[centerType][formationId] = {
            id: formationId,
            level: 1,
            stability: 100,
            createdAt: Date.now()
        };

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianFormationCreated', { centerType, formationId });

        console.log(`DantianSystem: Created formation ${formationId} in ${centerType} dantian`);
        return true;
    }

    /**
     * Get total combat power from dantian system
     */
    getDantianPower() {
        const dantian = this.gameState.get('dantian');

        if (!dantian?.centers) {
            return 0;
        }

        let totalPower = 0;

        // Power from dantian centers
        Object.entries(dantian.centers).forEach(([centerType, center]) => {
            if (center.opened) {
                const centerData = this.getDantianData(centerType);
                if (centerData) {
                    let power = centerData.basePower;
                    power += (center.level - 1) * centerData.powerPerLevel;
                    power += Math.floor(center.purity / 10) * centerData.purityBonus;
                    power *= center.density; // Density multiplier
                    totalPower += power;
                }
            }
        });

        // Power from formations
        Object.entries(dantian.formations || {}).forEach(([centerType, formations]) => {
            Object.entries(formations).forEach(([formationId, formation]) => {
                const formationData = this.getFormationData(formationId);
                if (formationData) {
                    let formationPower = formationData.powerBonus * formation.level;
                    formationPower *= formation.stability / 100; // Stability affects power
                    totalPower += formationPower;
                }
            });
        });

        return Math.floor(totalPower);
    }

    /**
     * Get opening prerequisites for dantian centers
     */
    getOpeningPrerequisites(centerType) {
        const prerequisites = {
            lower: { cultivation: 'Foundation Establishment', stage: 1 },
            middle: { cultivation: 'Core Formation', stage: 3, lowerDantianLevel: 5 },
            upper: { cultivation: 'Nascent Soul', stage: 5, middleDantianLevel: 8 }
        };

        return prerequisites[centerType] || {};
    }

    /**
     * Check if prerequisites are met
     */
    checkPrerequisites(prerequisites) {
        const cultivation = this.gameState.get('cultivation');
        const dantian = this.gameState.get('dantian');

        // Check cultivation realm and stage
        if (prerequisites.cultivation) {
            const realm = cultivation?.realm || 'Body Refinement';
            const stage = cultivation?.stage || 1;

            const realms = ['Body Refinement', 'Qi Condensation', 'Foundation Establishment', 'Core Formation', 'Nascent Soul'];
            const requiredRealmIndex = realms.indexOf(prerequisites.cultivation);
            const currentRealmIndex = realms.indexOf(realm);

            if (currentRealmIndex < requiredRealmIndex) {
                return false;
            }

            if (currentRealmIndex === requiredRealmIndex && stage < prerequisites.stage) {
                return false;
            }
        }

        // Check other dantian levels
        if (prerequisites.lowerDantianLevel && dantian.centers.lower.level < prerequisites.lowerDantianLevel) {
            return false;
        }

        if (prerequisites.middleDantianLevel && dantian.centers.middle.level < prerequisites.middleDantianLevel) {
            return false;
        }

        return true;
    }

    /**
     * Get base dantian capacity
     */
    getBaseDantianCapacity(centerType) {
        const baseCapacities = {
            lower: 100,
            middle: 200,
            upper: 500
        };

        return baseCapacities[centerType] || 100;
    }

    /**
     * Calculate dantian capacity based on level
     */
    calculateDantianCapacity(centerType, level) {
        const baseCapacity = this.getBaseDantianCapacity(centerType);
        return baseCapacity * Math.pow(1.5, level - 1);
    }

    /**
     * Get expansion requirements
     */
    getExpansionRequirements(centerType) {
        const dantian = this.gameState.get('dantian');
        const center = dantian.centers[centerType];

        if (!center) {
            return {};
        }

        const multipliers = {
            lower: 1.0,
            middle: 2.0,
            upper: 4.0
        };

        const baseMultiplier = multipliers[centerType] || 1.0;
        const levelMultiplier = Math.pow(1.5, center.level - 1);

        return {
            qi_essence: Math.floor(100 * baseMultiplier * levelMultiplier),
            dantian_pills: Math.floor(5 * baseMultiplier * levelMultiplier),
            spirit_stones: Math.floor(50 * baseMultiplier * levelMultiplier)
        };
    }

    /**
     * Get compression requirements
     */
    getCompressionRequirements(centerType) {
        const multipliers = {
            lower: 1.0,
            middle: 1.5,
            upper: 2.5
        };

        const baseMultiplier = multipliers[centerType] || 1.0;

        return {
            qi_essence: Math.floor(50 * baseMultiplier),
            compression_pills: Math.floor(2 * baseMultiplier),
            spirit_stones: Math.floor(25 * baseMultiplier)
        };
    }

    /**
     * Get expansion duration
     */
    getExpansionDuration(centerType, level) {
        const baseTimes = {
            lower: 300000,   // 5 minutes
            middle: 480000,  // 8 minutes
            upper: 720000    // 12 minutes
        };

        const baseTime = baseTimes[centerType] || 300000;
        const levelMultiplier = Math.pow(1.2, level - 1);

        return Math.floor(baseTime * levelMultiplier);
    }

    /**
     * Get compression duration
     */
    getCompressionDuration(centerType) {
        const durations = {
            lower: 240000,   // 4 minutes
            middle: 360000,  // 6 minutes
            upper: 600000    // 10 minutes
        };

        return durations[centerType] || 240000;
    }

    /**
     * Check if player has required resources
     */
    hasRequiredResources(requirements) {
        const dantian = this.gameState.get('dantian');

        for (const [resource, amount] of Object.entries(requirements)) {
            const available = dantian.resources[resource] || 0;
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
        const dantian = this.gameState.get('dantian');

        for (const [resource, amount] of Object.entries(requirements)) {
            dantian.resources[resource] = (dantian.resources[resource] || 0) - amount;
        }

        this.gameState.set('dantian', dantian);
    }

    /**
     * Add resources to inventory
     */
    addResources(resourceId, amount) {
        const dantian = this.gameState.get('dantian');
        dantian.resources[resourceId] = (dantian.resources[resourceId] || 0) + amount;

        this.gameState.set('dantian', dantian);
        this.eventManager.emit('dantianResourcesAdded', { resourceId, amount });
    }

    /**
     * Get dantian center data
     */
    getDantianData(centerType) {
        const dantianData = {
            lower: {
                name: 'Lower Dantian',
                description: 'Center of physical energy and qi storage',
                location: 'Below navel',
                basePower: 80,
                powerPerLevel: 25,
                purityBonus: 5,
                element: 'Earth',
                function: 'Qi Storage'
            },
            middle: {
                name: 'Middle Dantian',
                description: 'Center of emotional energy and spirit',
                location: 'Heart center',
                basePower: 120,
                powerPerLevel: 40,
                purityBonus: 8,
                element: 'Fire',
                function: 'Spirit Refinement'
            },
            upper: {
                name: 'Upper Dantian',
                description: 'Center of mental energy and consciousness',
                location: 'Forehead center',
                basePower: 180,
                powerPerLevel: 60,
                purityBonus: 12,
                element: 'Light',
                function: 'Consciousness'
            }
        };

        return dantianData[centerType] || null;
    }

    /**
     * Get formation data
     */
    getFormationData(formationId) {
        const formationsData = {
            spiral_vortex: {
                name: 'Spiral Vortex Formation',
                description: 'Creates a spinning vortex that accelerates qi circulation',
                powerBonus: 50,
                minLevel: 3,
                minPurity: 50,
                requirements: {
                    qi_essence: 200,
                    formation_cores: 3,
                    spirit_stones: 100
                },
                centerType: 'any',
                stability: 100
            },
            eight_trigrams: {
                name: 'Eight Trigrams Formation',
                description: 'Ancient formation that harmonizes all types of qi',
                powerBonus: 120,
                minLevel: 6,
                minPurity: 120,
                requirements: {
                    qi_essence: 500,
                    formation_cores: 8,
                    spirit_stones: 300
                },
                centerType: 'middle',
                stability: 100
            },
            celestial_array: {
                name: 'Celestial Array Formation',
                description: 'Connects dantian to celestial energies',
                powerBonus: 250,
                minLevel: 10,
                minPurity: 250,
                requirements: {
                    qi_essence: 1000,
                    formation_cores: 12,
                    celestial_crystals: 5,
                    spirit_stones: 800
                },
                centerType: 'upper',
                stability: 100
            }
        };

        return formationsData[formationId] || null;
    }

    /**
     * Get all dantian centers with their status
     */
    getAllDantianCenters() {
        const dantian = this.gameState.get('dantian');

        return ['lower', 'middle', 'upper'].map(centerType => {
            const center = dantian.centers[centerType];
            const data = this.getDantianData(centerType);
            const power = center.opened ? this.calculateCenterPower(centerType) : 0;

            return {
                type: centerType,
                ...data,
                ...center,
                power: power,
                isExpanding: dantian.expanding?.centerType === centerType,
                isCompressing: dantian.compressing?.centerType === centerType,
                expansionRequirements: this.getExpansionRequirements(centerType),
                compressionRequirements: this.getCompressionRequirements(centerType),
                canExpand: center.opened && this.hasRequiredResources(this.getExpansionRequirements(centerType)),
                canCompress: center.opened && this.hasRequiredResources(this.getCompressionRequirements(centerType)),
                formations: dantian.formations[centerType] || {}
            };
        });
    }

    /**
     * Calculate specific dantian center's power contribution
     */
    calculateCenterPower(centerType) {
        const dantian = this.gameState.get('dantian');
        const center = dantian.centers[centerType];
        const centerData = this.getDantianData(centerType);

        if (!center || !center.opened || !centerData) {
            return 0;
        }

        let power = centerData.basePower;
        power += (center.level - 1) * centerData.powerPerLevel;
        power += Math.floor(center.purity / 10) * centerData.purityBonus;
        power *= center.density;

        return Math.floor(power);
    }

    /**
     * Get dantian system status for UI display
     */
    getSystemStatus() {
        const dantian = this.gameState.get('dantian');

        return {
            unlocked: this.isUnlocked(),
            totalPower: this.getDantianPower(),
            expansionInProgress: !!dantian?.expanding,
            expandingCenter: dantian?.expanding?.centerType || null,
            expansionTimeRemaining: dantian?.expanding ?
                Math.max(0, (dantian.expanding.startTime + dantian.expanding.duration) - Date.now()) : 0,
            compressionInProgress: !!dantian?.compressing,
            compressingCenter: dantian?.compressing?.centerType || null,
            compressionTimeRemaining: dantian?.compressing ?
                Math.max(0, (dantian.compressing.startTime + dantian.compressing.duration) - Date.now()) : 0,
            openedCenters: Object.values(dantian?.centers || {}).filter(center => center.opened).length,
            totalFormations: Object.values(dantian?.formations || {}).reduce((total, centerFormations) =>
                total + Object.keys(centerFormations).length, 0),
            resources: dantian?.resources || {}
        };
    }

    /**
     * Process dantian-related idle gains
     */
    processIdleGains(timeElapsed) {
        const dantian = this.gameState.get('dantian');

        // Check expansion completion
        if (dantian?.expanding) {
            const expanding = dantian.expanding;
            const expansionEndTime = expanding.startTime + expanding.duration;
            const now = Date.now();

            if (now >= expansionEndTime) {
                const result = this.completeExpansion();
                if (result) {
                    console.log(`DantianSystem: Auto-completed expansion of ${result.centerType} dantian to level ${result.newLevel} during idle time`);
                }
            }
        }

        // Check compression completion
        if (dantian?.compressing) {
            const compressing = dantian.compressing;
            const compressionEndTime = compressing.startTime + compressing.duration;
            const now = Date.now();

            if (now >= compressionEndTime) {
                const result = this.completeCompression();
                if (result) {
                    console.log(`DantianSystem: Auto-completed compression of ${result.centerType} dantian during idle time`);
                }
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DantianSystem };
} else if (typeof window !== 'undefined') {
    window.DantianSystem = DantianSystem;
}