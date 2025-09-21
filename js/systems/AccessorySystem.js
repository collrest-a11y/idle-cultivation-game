/**
 * AccessorySystem - Cultivation accessory system for CP progression
 * Provides accessories that contribute significantly to combat power (5-8% of total CP)
 */
class AccessorySystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Initialize accessory system state
        this.initializeState();

        console.log('AccessorySystem: Initialized');
    }

    /**
     * Initialize accessory system state in game state
     */
    initializeState() {
        if (!this.gameState.get('accessories')) {
            this.gameState.set('accessories', {
                inventory: {},
                equipped: {
                    ring: null,
                    necklace: null,
                    bracelet: null,
                    pendant: null
                },
                enhancing: null,
                materials: {},
                unlocked: false
            });
        }
    }

    /**
     * Unlock the accessory system (typically at Qi Condensation realm)
     */
    unlockSystem() {
        const accessories = this.gameState.get('accessories');
        accessories.unlocked = true;

        // Give starter accessories
        this.addAccessory('basic_ring', 1);
        this.addAccessory('basic_necklace', 1);

        this.gameState.set('accessories', accessories);
        this.eventManager.emit('accessorySystemUnlocked');

        console.log('AccessorySystem: System unlocked');
    }

    /**
     * Check if accessory system is unlocked
     */
    isUnlocked() {
        const cultivation = this.gameState.get('cultivation');
        const realm = cultivation?.realm || 'Body Refinement';

        // Unlock at Qi Condensation or higher
        const realms = ['Body Refinement', 'Qi Condensation'];
        const realmIndex = realms.indexOf(realm);

        return realmIndex >= 1 || this.gameState.get('accessories')?.unlocked;
    }

    /**
     * Add accessory to inventory
     */
    addAccessory(accessoryId, quantity = 1) {
        const accessories = this.gameState.get('accessories');
        const accessoryData = this.getAccessoryData(accessoryId);

        if (!accessoryData) {
            console.warn(`AccessorySystem: Unknown accessory ${accessoryId}`);
            return false;
        }

        if (!accessories.inventory[accessoryId]) {
            accessories.inventory[accessoryId] = {
                id: accessoryId,
                quantity: 0,
                enhancement: 0,
                stars: 0
            };
        }

        accessories.inventory[accessoryId].quantity += quantity;

        this.gameState.set('accessories', accessories);
        this.eventManager.emit('accessoryAdded', { accessoryId, quantity, accessoryData });

        console.log(`AccessorySystem: Added ${quantity} ${accessoryId}`);
        return true;
    }

    /**
     * Equip accessory to specified slot
     */
    equipAccessory(accessoryId, slot) {
        const accessories = this.gameState.get('accessories');

        if (!accessories.inventory[accessoryId] || accessories.inventory[accessoryId].quantity <= 0) {
            console.warn(`AccessorySystem: Accessory ${accessoryId} not in inventory`);
            return false;
        }

        const accessoryData = this.getAccessoryData(accessoryId);
        if (!accessoryData || accessoryData.slot !== slot) {
            console.warn(`AccessorySystem: Accessory ${accessoryId} cannot be equipped to ${slot} slot`);
            return false;
        }

        // Unequip current accessory if any
        const currentEquipped = accessories.equipped[slot];
        if (currentEquipped) {
            this.unequipAccessory(slot);
        }

        // Equip new accessory
        accessories.equipped[slot] = accessoryId;
        accessories.inventory[accessoryId].quantity -= 1;

        this.gameState.set('accessories', accessories);
        this.eventManager.emit('accessoryEquipped', { accessoryId, slot, previousAccessory: currentEquipped });

        console.log(`AccessorySystem: Equipped ${accessoryId} to ${slot} slot`);
        return true;
    }

    /**
     * Unequip accessory from specified slot
     */
    unequipAccessory(slot) {
        const accessories = this.gameState.get('accessories');
        const equippedAccessory = accessories.equipped[slot];

        if (!equippedAccessory) {
            return false;
        }

        // Return to inventory
        if (!accessories.inventory[equippedAccessory]) {
            accessories.inventory[equippedAccessory] = {
                id: equippedAccessory,
                quantity: 0,
                enhancement: 0,
                stars: 0
            };
        }
        accessories.inventory[equippedAccessory].quantity += 1;

        // Clear slot
        accessories.equipped[slot] = null;

        this.gameState.set('accessories', accessories);
        this.eventManager.emit('accessoryUnequipped', { accessoryId: equippedAccessory, slot });

        console.log(`AccessorySystem: Unequipped ${equippedAccessory} from ${slot} slot`);
        return true;
    }

    /**
     * Start enhancing an accessory
     */
    startEnhancement(accessoryId) {
        const accessories = this.gameState.get('accessories');

        if (!accessories.inventory[accessoryId] || accessories.inventory[accessoryId].quantity <= 0) {
            console.warn(`AccessorySystem: Accessory ${accessoryId} not in inventory`);
            return false;
        }

        const currentEnhancement = accessories.inventory[accessoryId].enhancement || 0;
        const requirements = this.getEnhancementRequirements(accessoryId, currentEnhancement);

        // Check if player has required materials
        if (!this.hasRequiredMaterials(requirements)) {
            console.warn(`AccessorySystem: Insufficient materials for enhancement`);
            return false;
        }

        // Consume materials
        this.consumeMaterials(requirements);

        accessories.enhancing = {
            accessoryId: accessoryId,
            targetLevel: currentEnhancement + 1,
            startTime: Date.now(),
            duration: this.getEnhancementDuration(accessoryId, currentEnhancement)
        };

        this.gameState.set('accessories', accessories);
        this.eventManager.emit('accessoryEnhancementStarted', { accessoryId, targetLevel: currentEnhancement + 1 });

        console.log(`AccessorySystem: Started enhancing ${accessoryId} to level ${currentEnhancement + 1}`);
        return true;
    }

    /**
     * Complete accessory enhancement
     */
    completeEnhancement() {
        const accessories = this.gameState.get('accessories');

        if (!accessories.enhancing) {
            return null;
        }

        const { accessoryId, targetLevel, startTime, duration } = accessories.enhancing;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Enhancement not complete
        }

        // Apply enhancement increase
        if (accessories.inventory[accessoryId]) {
            accessories.inventory[accessoryId].enhancement = targetLevel;
        }

        // Clear enhancing
        accessories.enhancing = null;

        this.gameState.set('accessories', accessories);
        this.eventManager.emit('accessoryEnhancementCompleted', { accessoryId, newLevel: targetLevel });

        console.log(`AccessorySystem: Completed enhancement for ${accessoryId} to level ${targetLevel}`);
        return { accessoryId, newLevel: targetLevel };
    }

    /**
     * Get total combat power from equipped accessories
     */
    getEquippedAccessoriesPower() {
        const accessories = this.gameState.get('accessories');

        if (!accessories?.equipped) {
            return 0;
        }

        let totalPower = 0;

        Object.values(accessories.equipped).forEach(accessoryId => {
            if (accessoryId && accessories.inventory[accessoryId]) {
                const power = this.calculateAccessoryPower(accessoryId);
                totalPower += power;
            }
        });

        return Math.floor(totalPower);
    }

    /**
     * Calculate specific accessory's power contribution
     */
    calculateAccessoryPower(accessoryId) {
        const accessories = this.gameState.get('accessories');
        const accessoryData = this.getAccessoryData(accessoryId);

        if (!accessoryData || !accessories.inventory[accessoryId]) {
            return 0;
        }

        const enhancement = accessories.inventory[accessoryId].enhancement || 0;
        const stars = accessories.inventory[accessoryId].stars || 0;

        // Base power + enhancement bonus + star bonus
        let power = accessoryData.basePower;
        power += enhancement * accessoryData.enhancementPower;
        power += stars * accessoryData.starPower;

        return Math.floor(power);
    }

    /**
     * Get enhancement requirements for specific accessory and level
     */
    getEnhancementRequirements(accessoryId, currentLevel) {
        const accessoryData = this.getAccessoryData(accessoryId);

        if (!accessoryData) {
            return {};
        }

        // Base materials scale with level and accessory rarity
        const rarityMultipliers = {
            'Common': 1.0,
            'Uncommon': 1.3,
            'Rare': 1.8,
            'Epic': 2.5,
            'Legendary': 4.0
        };

        const multiplier = rarityMultipliers[accessoryData.rarity] || 1.0;
        const levelMultiplier = Math.pow(1.4, currentLevel);

        return {
            spirit_stones: Math.floor(50 * multiplier * levelMultiplier),
            enhancement_stones: Math.floor(3 * multiplier * levelMultiplier),
            [accessoryData.primaryMaterial]: Math.floor(5 * multiplier * levelMultiplier)
        };
    }

    /**
     * Get enhancement duration for specific accessory and level
     */
    getEnhancementDuration(accessoryId, currentLevel) {
        const accessoryData = this.getAccessoryData(accessoryId);

        if (!accessoryData) {
            return 60000; // 1 minute default
        }

        // Base time increases with level
        const baseTime = accessoryData.baseEnhancementTime || 120000;
        const levelMultiplier = Math.pow(1.15, currentLevel);

        return Math.floor(baseTime * levelMultiplier);
    }

    /**
     * Check if player has required materials
     */
    hasRequiredMaterials(requirements) {
        const accessories = this.gameState.get('accessories');

        for (const [material, amount] of Object.entries(requirements)) {
            const available = accessories.materials[material] || 0;
            if (available < amount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Consume materials for enhancement
     */
    consumeMaterials(requirements) {
        const accessories = this.gameState.get('accessories');

        for (const [material, amount] of Object.entries(requirements)) {
            accessories.materials[material] = (accessories.materials[material] || 0) - amount;
        }

        this.gameState.set('accessories', accessories);
    }

    /**
     * Add materials to inventory
     */
    addMaterials(materialId, amount) {
        const accessories = this.gameState.get('accessories');
        accessories.materials[materialId] = (accessories.materials[materialId] || 0) + amount;

        this.gameState.set('accessories', accessories);
        this.eventManager.emit('accessoryMaterialsAdded', { materialId, amount });
    }

    /**
     * Get all accessories in inventory
     */
    getInventoryAccessories() {
        const accessories = this.gameState.get('accessories');

        if (!accessories?.inventory) {
            return [];
        }

        return Object.keys(accessories.inventory).map(accessoryId => {
            const data = this.getAccessoryData(accessoryId);
            const inventoryData = accessories.inventory[accessoryId];
            const power = this.calculateAccessoryPower(accessoryId);

            return {
                id: accessoryId,
                ...data,
                ...inventoryData,
                power: power,
                isEquipped: Object.values(accessories.equipped).includes(accessoryId),
                isEnhancing: accessories.enhancing?.accessoryId === accessoryId,
                enhancementRequirements: this.getEnhancementRequirements(accessoryId, inventoryData.enhancement || 0),
                canEnhance: this.hasRequiredMaterials(this.getEnhancementRequirements(accessoryId, inventoryData.enhancement || 0))
            };
        });
    }

    /**
     * Get accessory data by ID
     */
    getAccessoryData(accessoryId) {
        const accessoriesData = {
            basic_ring: {
                name: 'Basic Ring',
                description: 'A simple ring that channels basic spiritual energy',
                rarity: 'Common',
                slot: 'ring',
                basePower: 45,
                enhancementPower: 8,
                starPower: 15,
                baseEnhancementTime: 90000, // 1.5 minutes
                primaryMaterial: 'copper_ore',
                unlockRequirement: 'Qi Condensation',
                type: 'Ring',
                element: 'Neutral'
            },

            spirit_ring: {
                name: 'Spirit Ring',
                description: 'A ring infused with concentrated spiritual essence',
                rarity: 'Uncommon',
                slot: 'ring',
                basePower: 85,
                enhancementPower: 15,
                starPower: 25,
                baseEnhancementTime: 120000, // 2 minutes
                primaryMaterial: 'spirit_jade',
                unlockRequirement: 'Foundation Establishment',
                type: 'Ring',
                element: 'Spirit'
            },

            basic_necklace: {
                name: 'Basic Necklace',
                description: 'A simple necklace that protects against spiritual interference',
                rarity: 'Common',
                slot: 'necklace',
                basePower: 55,
                enhancementPower: 10,
                starPower: 18,
                baseEnhancementTime: 100000, // 1.67 minutes
                primaryMaterial: 'silver_wire',
                unlockRequirement: 'Qi Condensation',
                type: 'Necklace',
                element: 'Neutral'
            },

            jade_necklace: {
                name: 'Jade Necklace',
                description: 'A necklace carved from pure spiritual jade',
                rarity: 'Uncommon',
                slot: 'necklace',
                basePower: 105,
                enhancementPower: 18,
                starPower: 30,
                baseEnhancementTime: 150000, // 2.5 minutes
                primaryMaterial: 'pure_jade',
                unlockRequirement: 'Foundation Establishment',
                type: 'Necklace',
                element: 'Earth'
            },

            spirit_bracelet: {
                name: 'Spirit Bracelet',
                description: 'A bracelet that enhances qi flow through the meridians',
                rarity: 'Rare',
                slot: 'bracelet',
                basePower: 150,
                enhancementPower: 25,
                starPower: 40,
                baseEnhancementTime: 200000, // 3.33 minutes
                primaryMaterial: 'spirit_crystal',
                unlockRequirement: 'Core Formation',
                type: 'Bracelet',
                element: 'Spirit'
            },

            phoenix_pendant: {
                name: 'Phoenix Pendant',
                description: 'A pendant containing the essence of a fire phoenix',
                rarity: 'Epic',
                slot: 'pendant',
                basePower: 280,
                enhancementPower: 45,
                starPower: 70,
                baseEnhancementTime: 300000, // 5 minutes
                primaryMaterial: 'phoenix_feather',
                unlockRequirement: 'Nascent Soul',
                type: 'Pendant',
                element: 'Fire'
            }
        };

        return accessoriesData[accessoryId] || null;
    }

    /**
     * Get accessory system status for UI display
     */
    getSystemStatus() {
        const accessories = this.gameState.get('accessories');

        return {
            unlocked: this.isUnlocked(),
            equipped: accessories?.equipped || {},
            totalEquippedPower: this.getEquippedAccessoriesPower(),
            enhancementInProgress: !!accessories?.enhancing,
            enhancingAccessory: accessories?.enhancing?.accessoryId || null,
            enhancementTimeRemaining: accessories?.enhancing ?
                Math.max(0, (accessories.enhancing.startTime + accessories.enhancing.duration) - Date.now()) : 0,
            inventoryCount: accessories?.inventory ? Object.keys(accessories.inventory).length : 0,
            materials: accessories?.materials || {}
        };
    }

    /**
     * Process accessory-related idle gains
     */
    processIdleGains(timeElapsed) {
        const accessories = this.gameState.get('accessories');

        if (!accessories?.enhancing) {
            return;
        }

        // Check if enhancement completed during idle time
        const enhancing = accessories.enhancing;
        const enhancementEndTime = enhancing.startTime + enhancing.duration;
        const now = Date.now();

        if (now >= enhancementEndTime) {
            // Enhancement completed during idle time
            const result = this.completeEnhancement();
            if (result) {
                console.log(`AccessorySystem: Auto-completed enhancement for ${result.accessoryId} to level ${result.newLevel} during idle time`);
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AccessorySystem };
} else if (typeof window !== 'undefined') {
    window.AccessorySystem = AccessorySystem;
}