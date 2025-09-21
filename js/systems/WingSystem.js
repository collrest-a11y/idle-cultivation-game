/**
 * WingSystem - Cultivation wing system for CP progression
 * Provides wings that contribute significantly to combat power (6-10% of total CP)
 */
class WingSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Initialize wing system state
        this.initializeState();

        console.log('WingSystem: Initialized');
    }

    /**
     * Initialize wing system state in game state
     */
    initializeState() {
        if (!this.gameState.get('wings')) {
            this.gameState.set('wings', {
                discovered: [],
                equipped: null,
                upgrading: null,
                materials: {},
                levels: {},
                unlocked: false
            });
        }
    }

    /**
     * Unlock the wing system (typically at Core Formation realm)
     */
    unlockSystem() {
        const wings = this.gameState.get('wings');
        wings.unlocked = true;

        // Give starter wings
        this.discoverWings('feather_wings');

        this.gameState.set('wings', wings);
        this.eventManager.emit('wingSystemUnlocked');

        console.log('WingSystem: System unlocked');
    }

    /**
     * Check if wing system is unlocked
     */
    isUnlocked() {
        const cultivation = this.gameState.get('cultivation');
        const realm = cultivation?.realm || 'Body Refinement';

        // Unlock at Core Formation or higher
        const realms = ['Body Refinement', 'Qi Condensation', 'Foundation Establishment', 'Core Formation'];
        const realmIndex = realms.indexOf(realm);

        return realmIndex >= 3 || this.gameState.get('wings')?.unlocked;
    }

    /**
     * Discover new wings
     */
    discoverWings(wingId) {
        const wings = this.gameState.get('wings');
        const wingData = this.getWingData(wingId);

        if (!wingData) {
            console.warn(`WingSystem: Unknown wings ${wingId}`);
            return false;
        }

        if (!wings.discovered.includes(wingId)) {
            wings.discovered.push(wingId);
            wings.levels[wingId] = 1;

            this.gameState.set('wings', wings);
            this.eventManager.emit('wingsDiscovered', { wingId, wingData });

            console.log(`WingSystem: Discovered wings ${wingId}`);
            return true;
        }

        return false;
    }

    /**
     * Equip wings for combat power bonus
     */
    equipWings(wingId) {
        const wings = this.gameState.get('wings');

        if (!wings.discovered.includes(wingId)) {
            console.warn(`WingSystem: Wings ${wingId} not discovered`);
            return false;
        }

        const oldEquipped = wings.equipped;
        wings.equipped = wingId;

        this.gameState.set('wings', wings);
        this.eventManager.emit('wingsEquipped', { wingId, previousWings: oldEquipped });

        console.log(`WingSystem: Equipped wings ${wingId}`);
        return true;
    }

    /**
     * Start upgrading wings to increase level and power
     */
    startUpgrade(wingId) {
        const wings = this.gameState.get('wings');

        if (!wings.discovered.includes(wingId)) {
            console.warn(`WingSystem: Wings ${wingId} not discovered`);
            return false;
        }

        const level = wings.levels[wingId] || 1;
        const requirements = this.getUpgradeRequirements(wingId, level);

        // Check if player has required materials
        if (!this.hasRequiredMaterials(requirements)) {
            console.warn(`WingSystem: Insufficient materials for upgrade`);
            return false;
        }

        // Consume materials
        this.consumeMaterials(requirements);

        wings.upgrading = {
            wingId: wingId,
            targetLevel: level + 1,
            startTime: Date.now(),
            duration: this.getUpgradeDuration(wingId, level)
        };

        this.gameState.set('wings', wings);
        this.eventManager.emit('wingsUpgradeStarted', { wingId, targetLevel: level + 1 });

        console.log(`WingSystem: Started upgrading wings ${wingId} to level ${level + 1}`);
        return true;
    }

    /**
     * Complete wing upgrade and apply level increase
     */
    completeUpgrade() {
        const wings = this.gameState.get('wings');

        if (!wings.upgrading) {
            return null;
        }

        const { wingId, targetLevel, startTime, duration } = wings.upgrading;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Upgrade not complete
        }

        // Apply level increase
        wings.levels[wingId] = targetLevel;

        // Clear upgrading
        wings.upgrading = null;

        this.gameState.set('wings', wings);
        this.eventManager.emit('wingsUpgradeCompleted', { wingId, newLevel: targetLevel });

        console.log(`WingSystem: Completed upgrade for wings ${wingId} to level ${targetLevel}`);
        return { wingId, newLevel: targetLevel };
    }

    /**
     * Get current equipped wings' contribution to combat power
     */
    getEquippedWingsPower() {
        const wings = this.gameState.get('wings');

        if (!wings?.equipped) {
            return 0;
        }

        const wingData = this.getWingData(wings.equipped);
        const level = wings.levels[wings.equipped] || 1;

        if (!wingData) {
            return 0;
        }

        // Base power + level scaling with diminishing returns
        let power = wingData.basePower;
        power += (level - 1) * wingData.powerPerLevel;

        // Diminishing returns for higher levels
        if (level > 10) {
            const diminishingBonus = Math.floor((level - 10) * wingData.powerPerLevel * 0.5);
            power += diminishingBonus;
        }

        return Math.floor(power);
    }

    /**
     * Get wing level
     */
    getWingLevel(wingId) {
        return this.gameState.get('wings')?.levels?.[wingId] || 1;
    }

    /**
     * Get upgrade requirements for specific wing and level
     */
    getUpgradeRequirements(wingId, currentLevel) {
        const wingData = this.getWingData(wingId);

        if (!wingData) {
            return {};
        }

        // Base materials scale with level and wing rarity
        const rarityMultipliers = {
            'Common': 1.0,
            'Uncommon': 1.5,
            'Rare': 2.0,
            'Epic': 3.0,
            'Legendary': 5.0
        };

        const multiplier = rarityMultipliers[wingData.rarity] || 1.0;
        const levelMultiplier = Math.pow(1.5, currentLevel - 1);

        return {
            spirit_stones: Math.floor(100 * multiplier * levelMultiplier),
            wing_essence: Math.floor(5 * multiplier * levelMultiplier),
            [wingData.primaryMaterial]: Math.floor(10 * multiplier * levelMultiplier)
        };
    }

    /**
     * Get upgrade duration for specific wing and level
     */
    getUpgradeDuration(wingId, currentLevel) {
        const wingData = this.getWingData(wingId);

        if (!wingData) {
            return 300000; // 5 minutes default
        }

        // Base time increases with level and rarity
        const baseTime = wingData.baseUpgradeTime || 300000;
        const levelMultiplier = Math.pow(1.2, currentLevel - 1);

        return Math.floor(baseTime * levelMultiplier);
    }

    /**
     * Check if player has required materials
     */
    hasRequiredMaterials(requirements) {
        const wings = this.gameState.get('wings');

        for (const [material, amount] of Object.entries(requirements)) {
            const available = wings.materials[material] || 0;
            if (available < amount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Consume materials for upgrade
     */
    consumeMaterials(requirements) {
        const wings = this.gameState.get('wings');

        for (const [material, amount] of Object.entries(requirements)) {
            wings.materials[material] = (wings.materials[material] || 0) - amount;
        }

        this.gameState.set('wings', wings);
    }

    /**
     * Add materials to inventory
     */
    addMaterials(materialId, amount) {
        const wings = this.gameState.get('wings');
        wings.materials[materialId] = (wings.materials[materialId] || 0) + amount;

        this.gameState.set('wings', wings);
        this.eventManager.emit('wingMaterialsAdded', { materialId, amount });
    }

    /**
     * Get all discovered wings with their current stats
     */
    getDiscoveredWings() {
        const wings = this.gameState.get('wings');

        if (!wings?.discovered) {
            return [];
        }

        return wings.discovered.map(wingId => {
            const data = this.getWingData(wingId);
            const level = wings.levels[wingId] || 1;
            const power = this.calculateWingPower(wingId);

            return {
                id: wingId,
                ...data,
                level: level,
                power: power,
                isEquipped: wings.equipped === wingId,
                isUpgrading: wings.upgrading?.wingId === wingId,
                upgradeRequirements: this.getUpgradeRequirements(wingId, level),
                canUpgrade: this.hasRequiredMaterials(this.getUpgradeRequirements(wingId, level))
            };
        });
    }

    /**
     * Calculate specific wing's power contribution
     */
    calculateWingPower(wingId) {
        const wingData = this.getWingData(wingId);
        const level = this.getWingLevel(wingId);

        if (!wingData) {
            return 0;
        }

        let power = wingData.basePower;
        power += (level - 1) * wingData.powerPerLevel;

        // Diminishing returns for higher levels
        if (level > 10) {
            const diminishingBonus = Math.floor((level - 10) * wingData.powerPerLevel * 0.5);
            power += diminishingBonus;
        }

        return Math.floor(power);
    }

    /**
     * Get wing data by ID
     */
    getWingData(wingId) {
        const wingsData = {
            feather_wings: {
                name: 'Feather Wings',
                description: 'Light wings made from spirit bird feathers, granting basic flight ability',
                rarity: 'Common',
                basePower: 120,
                powerPerLevel: 18,
                baseUpgradeTime: 180000, // 3 minutes
                primaryMaterial: 'spirit_feathers',
                unlockRequirement: 'Core Formation',
                type: 'Natural',
                element: 'Wind'
            },

            crystal_wings: {
                name: 'Crystal Wings',
                description: 'Crystalline wings that refract spiritual energy into pure power',
                rarity: 'Uncommon',
                basePower: 220,
                powerPerLevel: 32,
                baseUpgradeTime: 300000, // 5 minutes
                primaryMaterial: 'crystal_shards',
                unlockRequirement: 'Nascent Soul',
                type: 'Artificial',
                element: 'Earth'
            },

            flame_wings: {
                name: 'Flame Wings',
                description: 'Wings wreathed in eternal flames that burn with the power of the sun',
                rarity: 'Rare',
                basePower: 380,
                powerPerLevel: 55,
                baseUpgradeTime: 480000, // 8 minutes
                primaryMaterial: 'flame_cores',
                unlockRequirement: 'Soul Transformation',
                type: 'Elemental',
                element: 'Fire'
            },

            void_wings: {
                name: 'Void Wings',
                description: 'Wings that exist between dimensions, granting mastery over space itself',
                rarity: 'Epic',
                basePower: 620,
                powerPerLevel: 85,
                baseUpgradeTime: 720000, // 12 minutes
                primaryMaterial: 'void_fragments',
                unlockRequirement: 'Void Refining',
                type: 'Transcendent',
                element: 'Void'
            },

            divine_wings: {
                name: 'Divine Wings',
                description: 'Wings blessed by the heavens themselves, radiating celestial power',
                rarity: 'Legendary',
                basePower: 950,
                powerPerLevel: 125,
                baseUpgradeTime: 1200000, // 20 minutes
                primaryMaterial: 'divine_essence',
                unlockRequirement: 'Unity',
                type: 'Divine',
                element: 'Light'
            }
        };

        return wingsData[wingId] || null;
    }

    /**
     * Get wing system status for UI display
     */
    getSystemStatus() {
        const wings = this.gameState.get('wings');

        return {
            unlocked: this.isUnlocked(),
            equippedWings: wings?.equipped || null,
            equippedWingsPower: this.getEquippedWingsPower(),
            upgradeInProgress: !!wings?.upgrading,
            upgradingWings: wings?.upgrading?.wingId || null,
            upgradeTimeRemaining: wings?.upgrading ?
                Math.max(0, (wings.upgrading.startTime + wings.upgrading.duration) - Date.now()) : 0,
            discoveredCount: wings?.discovered?.length || 0,
            materials: wings?.materials || {},
            totalWings: Object.keys(this.getWingData('feather_wings') ? {
                feather_wings: true, crystal_wings: true, flame_wings: true, void_wings: true, divine_wings: true
            } : {}).length
        };
    }

    /**
     * Process wing-related idle gains
     */
    processIdleGains(timeElapsed) {
        const wings = this.gameState.get('wings');

        if (!wings?.upgrading) {
            return;
        }

        // Check if upgrade completed during idle time
        const upgrading = wings.upgrading;
        const upgradeEndTime = upgrading.startTime + upgrading.duration;
        const now = Date.now();

        if (now >= upgradeEndTime) {
            // Upgrade completed during idle time
            const result = this.completeUpgrade();
            if (result) {
                console.log(`WingSystem: Auto-completed upgrade for ${result.wingId} to level ${result.newLevel} during idle time`);
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WingSystem };
} else if (typeof window !== 'undefined') {
    window.WingSystem = WingSystem;
}