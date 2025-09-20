/**
 * RuneSystem - Advanced rune system for CP progression
 * Provides runes that contribute significantly to combat power (6-9% of total CP)
 */
class RuneSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Initialize rune system state
        this.initializeState();

        console.log('RuneSystem: Initialized');
    }

    /**
     * Initialize rune system state in game state
     */
    initializeState() {
        if (!this.gameState.get('runes')) {
            this.gameState.set('runes', {
                inventory: {},
                equipped: {
                    power: null,
                    defense: null,
                    speed: null,
                    spirit: null,
                    fortune: null,
                    vitality: null
                },
                fusing: null,
                materials: {},
                patterns: {},
                unlocked: false
            });
        }
    }

    /**
     * Unlock the rune system (typically at Foundation Establishment realm)
     */
    unlockSystem() {
        const runes = this.gameState.get('runes');
        runes.unlocked = true;

        // Give starter runes
        this.addRune('basic_power_rune', 1);
        this.addRune('basic_defense_rune', 1);

        this.gameState.set('runes', runes);
        this.eventManager.emit('runeSystemUnlocked');

        console.log('RuneSystem: System unlocked');
    }

    /**
     * Check if rune system is unlocked
     */
    isUnlocked() {
        const cultivation = this.gameState.get('cultivation');
        const realm = cultivation?.realm || 'Body Refinement';

        // Unlock at Foundation Establishment or higher
        const realms = ['Body Refinement', 'Qi Condensation', 'Foundation Establishment'];
        const realmIndex = realms.indexOf(realm);

        return realmIndex >= 2 || this.gameState.get('runes')?.unlocked;
    }

    /**
     * Add rune to inventory
     */
    addRune(runeId, quantity = 1) {
        const runes = this.gameState.get('runes');
        const runeData = this.getRuneData(runeId);

        if (!runeData) {
            console.warn(`RuneSystem: Unknown rune ${runeId}`);
            return false;
        }

        if (!runes.inventory[runeId]) {
            runes.inventory[runeId] = {
                id: runeId,
                quantity: 0,
                level: 1
            };
        }

        runes.inventory[runeId].quantity += quantity;

        this.gameState.set('runes', runes);
        this.eventManager.emit('runeAdded', { runeId, quantity, runeData });

        console.log(`RuneSystem: Added ${quantity} ${runeId}`);
        return true;
    }

    /**
     * Equip rune to specified slot
     */
    equipRune(runeId, slot) {
        const runes = this.gameState.get('runes');

        if (!runes.inventory[runeId] || runes.inventory[runeId].quantity <= 0) {
            console.warn(`RuneSystem: Rune ${runeId} not in inventory`);
            return false;
        }

        const runeData = this.getRuneData(runeId);
        if (!runeData || runeData.type !== slot) {
            console.warn(`RuneSystem: Rune ${runeId} cannot be equipped to ${slot} slot`);
            return false;
        }

        // Unequip current rune if any
        const currentEquipped = runes.equipped[slot];
        if (currentEquipped) {
            this.unequipRune(slot);
        }

        // Equip new rune
        runes.equipped[slot] = runeId;
        runes.inventory[runeId].quantity -= 1;

        this.gameState.set('runes', runes);
        this.eventManager.emit('runeEquipped', { runeId, slot, previousRune: currentEquipped });

        console.log(`RuneSystem: Equipped ${runeId} to ${slot} slot`);
        return true;
    }

    /**
     * Unequip rune from specified slot
     */
    unequipRune(slot) {
        const runes = this.gameState.get('runes');
        const equippedRune = runes.equipped[slot];

        if (!equippedRune) {
            return false;
        }

        // Return to inventory
        if (!runes.inventory[equippedRune]) {
            runes.inventory[equippedRune] = {
                id: equippedRune,
                quantity: 0,
                level: 1
            };
        }
        runes.inventory[equippedRune].quantity += 1;

        // Clear slot
        runes.equipped[slot] = null;

        this.gameState.set('runes', runes);
        this.eventManager.emit('runeUnequipped', { runeId: equippedRune, slot });

        console.log(`RuneSystem: Unequipped ${equippedRune} from ${slot} slot`);
        return true;
    }

    /**
     * Start fusing runes to create higher level runes
     */
    startFusion(runeId, quantity) {
        const runes = this.gameState.get('runes');

        if (!runes.inventory[runeId] || runes.inventory[runeId].quantity < quantity) {
            console.warn(`RuneSystem: Insufficient runes for fusion`);
            return false;
        }

        const runeData = this.getRuneData(runeId);
        const fusionRequirements = this.getFusionRequirements(runeId, quantity);

        // Check if player has required materials
        if (!this.hasRequiredMaterials(fusionRequirements.materials)) {
            console.warn(`RuneSystem: Insufficient materials for fusion`);
            return false;
        }

        // Consume runes and materials
        runes.inventory[runeId].quantity -= quantity;
        this.consumeMaterials(fusionRequirements.materials);

        runes.fusing = {
            baseRuneId: runeId,
            quantity: quantity,
            resultRuneId: fusionRequirements.resultRune,
            startTime: Date.now(),
            duration: this.getFusionDuration(runeId, quantity)
        };

        this.gameState.set('runes', runes);
        this.eventManager.emit('runeFusionStarted', { runeId, quantity, resultRune: fusionRequirements.resultRune });

        console.log(`RuneSystem: Started fusing ${quantity} ${runeId}`);
        return true;
    }

    /**
     * Complete rune fusion
     */
    completeFusion() {
        const runes = this.gameState.get('runes');

        if (!runes.fusing) {
            return null;
        }

        const { baseRuneId, quantity, resultRuneId, startTime, duration } = runes.fusing;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Fusion not complete
        }

        // Add result rune to inventory
        this.addRune(resultRuneId, 1);

        // Clear fusing
        runes.fusing = null;

        this.gameState.set('runes', runes);
        this.eventManager.emit('runeFusionCompleted', { baseRuneId, quantity, resultRuneId });

        console.log(`RuneSystem: Completed fusion of ${quantity} ${baseRuneId} into ${resultRuneId}`);
        return { baseRuneId, quantity, resultRuneId };
    }

    /**
     * Get total combat power from equipped runes
     */
    getEquippedRunesPower() {
        const runes = this.gameState.get('runes');

        if (!runes?.equipped) {
            return 0;
        }

        let totalPower = 0;

        Object.values(runes.equipped).forEach(runeId => {
            if (runeId && runes.inventory[runeId]) {
                const power = this.calculateRunePower(runeId);
                totalPower += power;
            }
        });

        return Math.floor(totalPower);
    }

    /**
     * Calculate specific rune's power contribution
     */
    calculateRunePower(runeId) {
        const runes = this.gameState.get('runes');
        const runeData = this.getRuneData(runeId);

        if (!runeData || !runes.inventory[runeId]) {
            return 0;
        }

        const level = runes.inventory[runeId].level || 1;

        // Base power + level scaling
        let power = runeData.basePower;
        power += (level - 1) * runeData.powerPerLevel;

        // Set bonus if equipped in compatible pattern
        const setBonus = this.calculateSetBonus(runeId);
        power += setBonus;

        return Math.floor(power);
    }

    /**
     * Calculate set bonus from rune patterns
     */
    calculateSetBonus(runeId) {
        const runes = this.gameState.get('runes');
        const runeData = this.getRuneData(runeId);

        if (!runeData?.setType) {
            return 0;
        }

        // Count equipped runes of the same set
        let setCount = 0;
        Object.values(runes.equipped).forEach(equippedRuneId => {
            if (equippedRuneId) {
                const equippedData = this.getRuneData(equippedRuneId);
                if (equippedData?.setType === runeData.setType) {
                    setCount++;
                }
            }
        });

        // Apply set bonuses based on count
        const setBonuses = {
            2: runeData.setBonus2 || 0,
            4: runeData.setBonus4 || 0,
            6: runeData.setBonus6 || 0
        };

        let totalBonus = 0;
        for (const [requiredCount, bonus] of Object.entries(setBonuses)) {
            if (setCount >= parseInt(requiredCount)) {
                totalBonus += bonus;
            }
        }

        return totalBonus;
    }

    /**
     * Get fusion requirements for specific rune and quantity
     */
    getFusionRequirements(runeId, quantity) {
        const runeData = this.getRuneData(runeId);

        if (!runeData) {
            return null;
        }

        // Define fusion patterns
        const fusionPatterns = {
            basic_power_rune: { result: 'enhanced_power_rune', baseQuantity: 3 },
            basic_defense_rune: { result: 'enhanced_defense_rune', baseQuantity: 3 },
            basic_speed_rune: { result: 'enhanced_speed_rune', baseQuantity: 3 },
            enhanced_power_rune: { result: 'superior_power_rune', baseQuantity: 3 },
            enhanced_defense_rune: { result: 'superior_defense_rune', baseQuantity: 3 },
            enhanced_speed_rune: { result: 'superior_speed_rune', baseQuantity: 3 }
        };

        const pattern = fusionPatterns[runeId];
        if (!pattern || quantity < pattern.baseQuantity) {
            return null;
        }

        const materialCost = Math.floor(quantity * runeData.fusionCost);

        return {
            resultRune: pattern.result,
            materials: {
                spirit_stones: materialCost,
                rune_essence: Math.floor(materialCost / 10)
            }
        };
    }

    /**
     * Get fusion duration
     */
    getFusionDuration(runeId, quantity) {
        const runeData = this.getRuneData(runeId);

        if (!runeData) {
            return 60000; // 1 minute default
        }

        // Base time increases with quantity and rune level
        const baseTime = runeData.baseFusionTime || 180000; // 3 minutes
        const quantityMultiplier = Math.sqrt(quantity);

        return Math.floor(baseTime * quantityMultiplier);
    }

    /**
     * Check if player has required materials
     */
    hasRequiredMaterials(requirements) {
        const runes = this.gameState.get('runes');

        for (const [material, amount] of Object.entries(requirements)) {
            const available = runes.materials[material] || 0;
            if (available < amount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Consume materials for fusion
     */
    consumeMaterials(requirements) {
        const runes = this.gameState.get('runes');

        for (const [material, amount] of Object.entries(requirements)) {
            runes.materials[material] = (runes.materials[material] || 0) - amount;
        }

        this.gameState.set('runes', runes);
    }

    /**
     * Add materials to inventory
     */
    addMaterials(materialId, amount) {
        const runes = this.gameState.get('runes');
        runes.materials[materialId] = (runes.materials[materialId] || 0) + amount;

        this.gameState.set('runes', runes);
        this.eventManager.emit('runeMaterialsAdded', { materialId, amount });
    }

    /**
     * Get all runes in inventory
     */
    getInventoryRunes() {
        const runes = this.gameState.get('runes');

        if (!runes?.inventory) {
            return [];
        }

        return Object.keys(runes.inventory).map(runeId => {
            const data = this.getRuneData(runeId);
            const inventoryData = runes.inventory[runeId];
            const power = this.calculateRunePower(runeId);

            return {
                id: runeId,
                ...data,
                ...inventoryData,
                power: power,
                isEquipped: Object.values(runes.equipped).includes(runeId),
                isFusing: runes.fusing?.baseRuneId === runeId,
                fusionRequirements: this.getFusionRequirements(runeId, 3),
                canFuse: this.getFusionRequirements(runeId, 3) !== null &&
                        inventoryData.quantity >= 3 &&
                        this.hasRequiredMaterials(this.getFusionRequirements(runeId, 3)?.materials || {})
            };
        });
    }

    /**
     * Get rune data by ID
     */
    getRuneData(runeId) {
        const runesData = {
            basic_power_rune: {
                name: 'Basic Power Rune',
                description: 'A simple rune that enhances physical and spiritual attack power',
                rarity: 'Common',
                type: 'power',
                basePower: 60,
                powerPerLevel: 12,
                fusionCost: 10,
                baseFusionTime: 120000, // 2 minutes
                unlockRequirement: 'Foundation Establishment',
                setType: 'warrior',
                setBonus2: 20,
                setBonus4: 50,
                setBonus6: 100,
                element: 'Fire'
            },

            basic_defense_rune: {
                name: 'Basic Defense Rune',
                description: 'A simple rune that enhances defensive capabilities',
                rarity: 'Common',
                type: 'defense',
                basePower: 55,
                powerPerLevel: 11,
                fusionCost: 10,
                baseFusionTime: 120000,
                unlockRequirement: 'Foundation Establishment',
                setType: 'guardian',
                setBonus2: 25,
                setBonus4: 60,
                setBonus6: 120,
                element: 'Earth'
            },

            basic_speed_rune: {
                name: 'Basic Speed Rune',
                description: 'A simple rune that enhances movement and reaction speed',
                rarity: 'Common',
                type: 'speed',
                basePower: 50,
                powerPerLevel: 10,
                fusionCost: 10,
                baseFusionTime: 120000,
                unlockRequirement: 'Foundation Establishment',
                setType: 'swift',
                setBonus2: 15,
                setBonus4: 40,
                setBonus6: 85,
                element: 'Wind'
            },

            enhanced_power_rune: {
                name: 'Enhanced Power Rune',
                description: 'An enhanced rune with significantly improved attack power',
                rarity: 'Uncommon',
                type: 'power',
                basePower: 120,
                powerPerLevel: 24,
                fusionCost: 25,
                baseFusionTime: 180000,
                unlockRequirement: 'Core Formation',
                setType: 'warrior',
                setBonus2: 40,
                setBonus4: 100,
                setBonus6: 200,
                element: 'Fire'
            },

            spirit_rune: {
                name: 'Spirit Rune',
                description: 'A rune that enhances spiritual power and qi manipulation',
                rarity: 'Rare',
                type: 'spirit',
                basePower: 180,
                powerPerLevel: 36,
                fusionCost: 50,
                baseFusionTime: 300000,
                unlockRequirement: 'Nascent Soul',
                setType: 'mystic',
                setBonus2: 60,
                setBonus4: 150,
                setBonus6: 300,
                element: 'Spirit'
            },

            fortune_rune: {
                name: 'Fortune Rune',
                description: 'A rare rune that influences luck and critical strike rates',
                rarity: 'Epic',
                type: 'fortune',
                basePower: 250,
                powerPerLevel: 50,
                fusionCost: 100,
                baseFusionTime: 480000,
                unlockRequirement: 'Soul Transformation',
                setType: 'blessed',
                setBonus2: 80,
                setBonus4: 200,
                setBonus6: 450,
                element: 'Light'
            }
        };

        return runesData[runeId] || null;
    }

    /**
     * Get rune system status for UI display
     */
    getSystemStatus() {
        const runes = this.gameState.get('runes');

        return {
            unlocked: this.isUnlocked(),
            equipped: runes?.equipped || {},
            totalEquippedPower: this.getEquippedRunesPower(),
            fusionInProgress: !!runes?.fusing,
            fusingRune: runes?.fusing?.baseRuneId || null,
            fusionTimeRemaining: runes?.fusing ?
                Math.max(0, (runes.fusing.startTime + runes.fusing.duration) - Date.now()) : 0,
            inventoryCount: runes?.inventory ? Object.keys(runes.inventory).length : 0,
            materials: runes?.materials || {},
            activeSets: this.getActiveSets()
        };
    }

    /**
     * Get currently active rune sets
     */
    getActiveSets() {
        const runes = this.gameState.get('runes');
        const setCounts = {};

        // Count runes by set type
        Object.values(runes?.equipped || {}).forEach(runeId => {
            if (runeId) {
                const runeData = this.getRuneData(runeId);
                if (runeData?.setType) {
                    setCounts[runeData.setType] = (setCounts[runeData.setType] || 0) + 1;
                }
            }
        });

        return setCounts;
    }

    /**
     * Process rune-related idle gains
     */
    processIdleGains(timeElapsed) {
        const runes = this.gameState.get('runes');

        if (!runes?.fusing) {
            return;
        }

        // Check if fusion completed during idle time
        const fusing = runes.fusing;
        const fusionEndTime = fusing.startTime + fusing.duration;
        const now = Date.now();

        if (now >= fusionEndTime) {
            // Fusion completed during idle time
            const result = this.completeFusion();
            if (result) {
                console.log(`RuneSystem: Auto-completed fusion of ${result.quantity} ${result.baseRuneId} into ${result.resultRuneId} during idle time`);
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RuneSystem };
} else if (typeof window !== 'undefined') {
    window.RuneSystem = RuneSystem;
}