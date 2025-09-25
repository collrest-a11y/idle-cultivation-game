/**
 * CraftingSystem - Comprehensive crafting and alchemy system
 * Handles recipe management, resource consumption, success rates, and item creation
 */
class CraftingSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Crafting state
        this.currentCrafting = null;
        this.craftingQueue = [];
        this.maxQueueSize = 5;

        // Crafting statistics
        this.statistics = {
            itemsCrafted: 0,
            successfulCrafts: 0,
            failedCrafts: 0,
            materialsSaved: 0, // From high skill levels
            rareItemsCreated: 0,
            totalValueCrafted: 0
        };

        // Skill levels for different crafting categories
        this.skills = {
            alchemy: { level: 1, experience: 0, experienceRequired: 100 },
            smithing: { level: 1, experience: 0, experienceRequired: 100 },
            inscription: { level: 1, experience: 0, experienceRequired: 100 },
            cooking: { level: 1, experience: 0, experienceRequired: 100 },
            enchanting: { level: 1, experience: 0, experienceRequired: 100 }
        };

        // Recipe database
        this.recipes = this.initializeRecipes();

        // Materials inventory
        this.materials = {
            // Basic materials
            spirit_stone: 0,
            cultivation_pill: 0,
            iron_ore: 0,
            spirit_herb: 0,
            beast_core: 0,

            // Intermediate materials
            refined_iron: 0,
            spirit_essence: 0,
            mystic_crystal: 0,
            dragon_scale: 0,
            phoenix_feather: 0,

            // Rare materials
            immortal_jade: 0,
            void_crystal: 0,
            star_metal: 0,
            divine_essence: 0
        };

        this.isInitialized = false;
        console.log('CraftingSystem: Initialized');
    }

    /**
     * Initialize the crafting system
     */
    async initialize() {
        try {
            // Load saved crafting data
            const savedData = this.gameState.get('crafting');
            if (savedData) {
                this.statistics = { ...this.statistics, ...savedData.statistics };
                this.skills = { ...this.skills, ...savedData.skills };
                this.materials = { ...this.materials, ...savedData.materials };
            }

            this.isInitialized = true;

            this.eventManager.emit('crafting:initialized', {
                skills: this.skills,
                statistics: this.statistics
            });

            console.log('CraftingSystem: Initialization complete');
        } catch (error) {
            console.error('CraftingSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start crafting an item
     * @param {string} recipeId - Recipe identifier
     * @param {number} quantity - Number of items to craft
     * @returns {Object} Crafting result
     */
    startCrafting(recipeId, quantity = 1) {
        if (!this.isInitialized) {
            throw new Error('CraftingSystem not initialized');
        }

        const recipe = this.recipes[recipeId];
        if (!recipe) {
            return {
                success: false,
                reason: 'recipe_not_found',
                message: 'Recipe not found'
            };
        }

        // Check if recipe is unlocked
        if (!this.isRecipeUnlocked(recipe)) {
            return {
                success: false,
                reason: 'recipe_locked',
                message: `Need ${recipe.category} level ${recipe.requiredLevel}`
            };
        }

        // Check materials
        const materialCheck = this.checkMaterials(recipe, quantity);
        if (!materialCheck.sufficient) {
            return {
                success: false,
                reason: 'insufficient_materials',
                message: 'Not enough materials',
                missing: materialCheck.missing
            };
        }

        // Add to crafting queue if busy
        if (this.currentCrafting) {
            if (this.craftingQueue.length >= this.maxQueueSize) {
                return {
                    success: false,
                    reason: 'queue_full',
                    message: 'Crafting queue is full'
                };
            }

            this.craftingQueue.push({ recipeId, quantity });
            return {
                success: true,
                queued: true,
                position: this.craftingQueue.length
            };
        }

        // Start crafting immediately
        return this.executeCrafting(recipe, quantity);
    }

    /**
     * Execute the crafting process
     * @param {Object} recipe - Recipe data
     * @param {number} quantity - Quantity to craft
     * @returns {Object} Crafting result
     */
    executeCrafting(recipe, quantity) {
        // Consume materials
        this.consumeMaterials(recipe, quantity);

        // Calculate success rate
        const successRate = this.calculateSuccessRate(recipe);
        const craftingTime = this.calculateCraftingTime(recipe, quantity);

        this.currentCrafting = {
            recipe: recipe,
            quantity: quantity,
            remainingTime: craftingTime,
            totalTime: craftingTime,
            successRate: successRate,
            startTime: Date.now()
        };

        // Start crafting timer
        setTimeout(() => {
            this.completeCrafting();
        }, craftingTime);

        this.eventManager.emit('crafting:started', {
            recipeId: recipe.id,
            quantity: quantity,
            craftingTime: craftingTime,
            successRate: successRate
        });

        return {
            success: true,
            craftingTime: craftingTime,
            successRate: successRate
        };
    }

    /**
     * Complete the crafting process
     */
    completeCrafting() {
        if (!this.currentCrafting) return;

        const { recipe, quantity, successRate } = this.currentCrafting;
        const results = [];
        let successCount = 0;
        let failCount = 0;

        // Roll for each item
        for (let i = 0; i < quantity; i++) {
            const roll = Math.random();
            const success = roll < successRate;

            if (success) {
                successCount++;
                const item = this.createCraftedItem(recipe);
                results.push(item);

                // Add to inventory or materials
                this.addCraftedItem(item);

                // Give experience
                this.giveExperience(recipe.category, recipe.experienceGain || 10);
            } else {
                failCount++;
                // Partial material recovery on failure
                this.recoverMaterials(recipe, 0.25);
            }
        }

        // Update statistics
        this.statistics.itemsCrafted += quantity;
        this.statistics.successfulCrafts += successCount;
        this.statistics.failedCrafts += failCount;

        // Calculate total value
        const totalValue = results.reduce((sum, item) => sum + (item.value || 0), 0);
        this.statistics.totalValueCrafted += totalValue;

        this.eventManager.emit('crafting:completed', {
            recipe: recipe,
            quantity: quantity,
            successCount: successCount,
            failCount: failCount,
            results: results,
            totalValue: totalValue
        });

        console.log(`CraftingSystem: Completed ${recipe.name} x${quantity} (${successCount} success, ${failCount} failed)`);

        // Clear current crafting
        this.currentCrafting = null;

        // Process queue
        if (this.craftingQueue.length > 0) {
            const next = this.craftingQueue.shift();
            const nextRecipe = this.recipes[next.recipeId];
            if (nextRecipe) {
                setTimeout(() => {
                    this.executeCrafting(nextRecipe, next.quantity);
                }, 1000); // Small delay between crafts
            }
        }

        // Save progress
        this.saveData();
    }

    /**
     * Cancel current crafting
     * @returns {Object} Cancellation result
     */
    cancelCrafting() {
        if (!this.currentCrafting) {
            return { success: false, reason: 'no_crafting_in_progress' };
        }

        const refundRate = 0.75; // 75% material refund
        this.refundMaterials(this.currentCrafting.recipe, this.currentCrafting.quantity, refundRate);

        this.eventManager.emit('crafting:cancelled', {
            recipe: this.currentCrafting.recipe,
            refundRate: refundRate
        });

        this.currentCrafting = null;
        return { success: true, refundRate: refundRate };
    }

    /**
     * Get available recipes for a category
     * @param {string} category - Crafting category
     * @returns {Array} Available recipes
     */
    getAvailableRecipes(category = null) {
        const allRecipes = Object.values(this.recipes);

        return allRecipes.filter(recipe => {
            if (category && recipe.category !== category) return false;
            return this.isRecipeUnlocked(recipe);
        });
    }

    /**
     * Add materials to inventory
     * @param {string} materialId - Material identifier
     * @param {number} amount - Amount to add
     */
    addMaterial(materialId, amount) {
        if (this.materials.hasOwnProperty(materialId)) {
            this.materials[materialId] += amount;

            this.eventManager.emit('crafting:material_added', {
                materialId: materialId,
                amount: amount,
                newTotal: this.materials[materialId]
            });
        }
    }

    /**
     * Remove materials from inventory
     * @param {string} materialId - Material identifier
     * @param {number} amount - Amount to remove
     * @returns {boolean} Success
     */
    removeMaterial(materialId, amount) {
        if (!this.materials.hasOwnProperty(materialId) || this.materials[materialId] < amount) {
            return false;
        }

        this.materials[materialId] -= amount;
        return true;
    }

    /**
     * Get current crafting progress
     * @returns {Object} Current crafting state
     */
    getCurrentCrafting() {
        if (!this.currentCrafting) return null;

        const elapsed = Date.now() - this.currentCrafting.startTime;
        const progress = Math.min(1, elapsed / this.currentCrafting.totalTime);

        return {
            recipe: this.currentCrafting.recipe,
            quantity: this.currentCrafting.quantity,
            progress: progress,
            remainingTime: Math.max(0, this.currentCrafting.totalTime - elapsed),
            successRate: this.currentCrafting.successRate
        };
    }

    /**
     * Get crafting statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Get skill levels
     * @returns {Object} Skill data
     */
    getSkills() {
        return { ...this.skills };
    }

    /**
     * Get materials inventory
     * @returns {Object} Materials
     */
    getMaterials() {
        return { ...this.materials };
    }

    // Private methods

    /**
     * Initialize recipe database
     * @returns {Object} Recipe database
     */
    initializeRecipes() {
        return {
            // Alchemy recipes
            basic_healing_pill: {
                id: 'basic_healing_pill',
                name: 'Basic Healing Pill',
                description: 'Restores health over time',
                category: 'alchemy',
                requiredLevel: 1,
                materials: {
                    spirit_herb: 2,
                    spirit_stone: 1
                },
                result: {
                    id: 'healing_pill',
                    name: 'Healing Pill',
                    type: 'consumable',
                    effect: { healOverTime: 50, duration: 10000 },
                    value: 25
                },
                craftingTime: 30000, // 30 seconds
                baseSuccessRate: 0.8,
                experienceGain: 15
            },

            qi_enhancement_pill: {
                id: 'qi_enhancement_pill',
                name: 'Qi Enhancement Pill',
                description: 'Temporarily increases cultivation speed',
                category: 'alchemy',
                requiredLevel: 3,
                materials: {
                    spirit_herb: 3,
                    spirit_essence: 1,
                    cultivation_pill: 1
                },
                result: {
                    id: 'qi_pill',
                    name: 'Qi Enhancement Pill',
                    type: 'consumable',
                    effect: { qiMultiplier: 1.5, duration: 300000 }, // 5 minutes
                    value: 100
                },
                craftingTime: 60000, // 1 minute
                baseSuccessRate: 0.65,
                experienceGain: 35
            },

            // Smithing recipes
            iron_sword: {
                id: 'iron_sword',
                name: 'Iron Sword',
                description: 'A basic weapon for cultivators',
                category: 'smithing',
                requiredLevel: 1,
                materials: {
                    iron_ore: 3,
                    spirit_stone: 1
                },
                result: {
                    id: 'iron_sword',
                    name: 'Iron Sword',
                    type: 'weapon',
                    combatPower: 15,
                    value: 50
                },
                craftingTime: 45000,
                baseSuccessRate: 0.75,
                experienceGain: 20
            },

            spirit_armor: {
                id: 'spirit_armor',
                name: 'Spirit-Infused Armor',
                description: 'Armor enhanced with spiritual energy',
                category: 'smithing',
                requiredLevel: 5,
                materials: {
                    refined_iron: 2,
                    spirit_essence: 2,
                    mystic_crystal: 1
                },
                result: {
                    id: 'spirit_armor',
                    name: 'Spirit Armor',
                    type: 'armor',
                    combatPower: 45,
                    stats: { damageReduction: 0.1 },
                    value: 250
                },
                craftingTime: 120000, // 2 minutes
                baseSuccessRate: 0.6,
                experienceGain: 75
            },

            // Inscription recipes
            basic_talisman: {
                id: 'basic_talisman',
                name: 'Basic Protection Talisman',
                description: 'A simple talisman that provides protection',
                category: 'inscription',
                requiredLevel: 1,
                materials: {
                    spirit_stone: 2,
                    iron_ore: 1
                },
                result: {
                    id: 'protection_talisman',
                    name: 'Protection Talisman',
                    type: 'talisman',
                    effect: { damageReduction: 0.05, duration: 600000 }, // 10 minutes
                    value: 40
                },
                craftingTime: 40000,
                baseSuccessRate: 0.7,
                experienceGain: 18
            },

            // Cooking recipes
            spirit_food: {
                id: 'spirit_food',
                name: 'Spirit-Enriched Food',
                description: 'Food that nourishes both body and spirit',
                category: 'cooking',
                requiredLevel: 1,
                materials: {
                    spirit_herb: 1,
                    beast_core: 1
                },
                result: {
                    id: 'spirit_food',
                    name: 'Spirit Food',
                    type: 'consumable',
                    effect: { cultivationMultiplier: 1.25, duration: 180000 }, // 3 minutes
                    value: 30
                },
                craftingTime: 25000,
                baseSuccessRate: 0.85,
                experienceGain: 12
            }
        };
    }

    /**
     * Check if recipe is unlocked
     * @param {Object} recipe - Recipe to check
     * @returns {boolean} Unlocked status
     */
    isRecipeUnlocked(recipe) {
        const skill = this.skills[recipe.category];
        return skill && skill.level >= recipe.requiredLevel;
    }

    /**
     * Check if sufficient materials are available
     * @param {Object} recipe - Recipe to check
     * @param {number} quantity - Quantity to craft
     * @returns {Object} Material check result
     */
    checkMaterials(recipe, quantity) {
        const missing = {};
        let sufficient = true;

        for (const [materialId, required] of Object.entries(recipe.materials)) {
            const needed = required * quantity;
            const available = this.materials[materialId] || 0;

            if (available < needed) {
                sufficient = false;
                missing[materialId] = needed - available;
            }
        }

        return { sufficient, missing };
    }

    /**
     * Consume materials for crafting
     * @param {Object} recipe - Recipe being crafted
     * @param {number} quantity - Quantity being crafted
     */
    consumeMaterials(recipe, quantity) {
        for (const [materialId, required] of Object.entries(recipe.materials)) {
            const needed = required * quantity;
            this.materials[materialId] -= needed;
        }
    }

    /**
     * Refund materials on cancellation
     * @param {Object} recipe - Recipe being cancelled
     * @param {number} quantity - Quantity being cancelled
     * @param {number} refundRate - Refund percentage
     */
    refundMaterials(recipe, quantity, refundRate) {
        for (const [materialId, required] of Object.entries(recipe.materials)) {
            const refund = Math.floor(required * quantity * refundRate);
            this.materials[materialId] += refund;
        }
    }

    /**
     * Recover materials on failure
     * @param {Object} recipe - Recipe that failed
     * @param {number} recoveryRate - Recovery percentage
     */
    recoverMaterials(recipe, recoveryRate) {
        let recovered = 0;
        for (const [materialId, required] of Object.entries(recipe.materials)) {
            const recovery = Math.floor(required * recoveryRate);
            if (recovery > 0) {
                this.materials[materialId] += recovery;
                recovered += recovery;
            }
        }

        if (recovered > 0) {
            this.statistics.materialsSaved += recovered;
        }
    }

    /**
     * Calculate success rate for crafting
     * @param {Object} recipe - Recipe being crafted
     * @returns {number} Success rate (0-1)
     */
    calculateSuccessRate(recipe) {
        const skill = this.skills[recipe.category];
        const baseRate = recipe.baseSuccessRate;

        // Skill bonus: +2% per level above required
        const skillBonus = Math.max(0, skill.level - recipe.requiredLevel) * 0.02;

        // Cap at 95% success rate
        return Math.min(0.95, baseRate + skillBonus);
    }

    /**
     * Calculate crafting time
     * @param {Object} recipe - Recipe being crafted
     * @param {number} quantity - Quantity being crafted
     * @returns {number} Crafting time in milliseconds
     */
    calculateCraftingTime(recipe, quantity) {
        const skill = this.skills[recipe.category];
        const baseTime = recipe.craftingTime;

        // Time reduction: -5% per skill level above required (max 50% reduction)
        const skillReduction = Math.min(0.5, Math.max(0, skill.level - recipe.requiredLevel) * 0.05);
        const adjustedTime = baseTime * (1 - skillReduction);

        return Math.floor(adjustedTime * quantity);
    }

    /**
     * Create crafted item with potential quality variations
     * @param {Object} recipe - Recipe used
     * @returns {Object} Created item
     */
    createCraftedItem(recipe) {
        const baseItem = { ...recipe.result };

        // Quality roll - higher skill = better chance for quality items
        const skill = this.skills[recipe.category];
        const qualityRoll = Math.random() + (skill.level * 0.01);

        if (qualityRoll > 0.95) {
            // Legendary quality
            baseItem.quality = 'legendary';
            baseItem.name = `Legendary ${baseItem.name}`;
            if (baseItem.combatPower) baseItem.combatPower *= 2;
            if (baseItem.value) baseItem.value *= 5;
            this.statistics.rareItemsCreated++;
        } else if (qualityRoll > 0.85) {
            // Superior quality
            baseItem.quality = 'superior';
            baseItem.name = `Superior ${baseItem.name}`;
            if (baseItem.combatPower) baseItem.combatPower *= 1.5;
            if (baseItem.value) baseItem.value *= 3;
            this.statistics.rareItemsCreated++;
        } else if (qualityRoll > 0.65) {
            // High quality
            baseItem.quality = 'high';
            baseItem.name = `High Quality ${baseItem.name}`;
            if (baseItem.combatPower) baseItem.combatPower *= 1.25;
            if (baseItem.value) baseItem.value *= 2;
        } else {
            // Normal quality
            baseItem.quality = 'normal';
        }

        return baseItem;
    }

    /**
     * Add crafted item to appropriate storage
     * @param {Object} item - Item to add
     */
    addCraftedItem(item) {
        // This would integrate with inventory system when available
        // For now, convert high-value items to currency
        if (item.type === 'consumable' && item.effect) {
            // Add to consumables (would be inventory system)
            this.eventManager.emit('inventory:item_added', item);
        } else if (item.combatPower) {
            // Equipment items - add to equipment storage
            this.eventManager.emit('equipment:item_added', item);
        } else {
            // Convert to currency
            const value = item.value || 10;
            this.gameState.increment('player.spiritCrystals', value);
        }
    }

    /**
     * Give experience to crafting skill
     * @param {string} category - Skill category
     * @param {number} amount - Experience amount
     */
    giveExperience(category, amount) {
        const skill = this.skills[category];
        if (!skill) return;

        skill.experience += amount;

        // Level up check
        while (skill.experience >= skill.experienceRequired) {
            skill.experience -= skill.experienceRequired;
            skill.level++;
            skill.experienceRequired = Math.floor(skill.experienceRequired * 1.5);

            this.eventManager.emit('crafting:skill_level_up', {
                category: category,
                newLevel: skill.level,
                experienceRequired: skill.experienceRequired
            });

            console.log(`CraftingSystem: ${category} skill leveled up to ${skill.level}`);
        }
    }

    /**
     * Save crafting data to game state
     */
    saveData() {
        this.gameState.update({
            crafting: {
                statistics: this.statistics,
                skills: this.skills,
                materials: this.materials
            }
        }, { source: 'crafting:save' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CraftingSystem };
} else if (typeof window !== 'undefined') {
    window.CraftingSystem = CraftingSystem;
}