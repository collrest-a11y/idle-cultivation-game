/**
 * ShopManager - Comprehensive shop and marketplace system
 * Handles item listings, transactions, currency management, and dynamic pricing
 */
class ShopManager {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Shop categories
        this.shops = {
            general: {
                id: 'general',
                name: 'General Store',
                description: 'Basic cultivation supplies and materials',
                refreshInterval: 3600000, // 1 hour
                maxItems: 12,
                items: []
            },
            scripture: {
                id: 'scripture',
                name: 'Scripture Pavilion',
                description: 'Cultivation techniques and manuals',
                refreshInterval: 7200000, // 2 hours
                maxItems: 8,
                items: []
            },
            equipment: {
                id: 'equipment',
                name: 'Immortal Armory',
                description: 'Weapons, armor, and cultivation tools',
                refreshInterval: 5400000, // 1.5 hours
                maxItems: 10,
                items: []
            },
            alchemy: {
                id: 'alchemy',
                name: 'Alchemist\'s Corner',
                description: 'Pills, elixirs, and alchemical materials',
                refreshInterval: 1800000, // 30 minutes
                maxItems: 15,
                items: []
            },
            rare: {
                id: 'rare',
                name: 'Treasure Vault',
                description: 'Rare and legendary items',
                refreshInterval: 86400000, // 24 hours
                maxItems: 5,
                items: []
            }
        };

        // Transaction history
        this.transactionHistory = [];
        this.maxHistorySize = 100;

        // Shop statistics
        this.statistics = {
            totalTransactions: 0,
            totalSpent: {
                jade: 0,
                spiritCrystals: 0,
                shards: 0
            },
            totalEarned: {
                jade: 0,
                spiritCrystals: 0,
                shards: 0
            },
            itemsPurchased: 0,
            itemsSold: 0,
            bestDeal: null,
            favoriteShop: null
        };

        // Player reputation and discounts
        this.reputation = {
            level: 1,
            points: 0,
            pointsRequired: 100,
            discount: 0, // Percentage discount
            maxDiscount: 0.25 // 25% max discount
        };

        this.isInitialized = false;
        console.log('ShopManager: Initialized');
    }

    /**
     * Initialize the shop manager
     */
    async initialize() {
        try {
            // Load saved shop data
            const savedData = this.gameState.get('shop');
            if (savedData) {
                this.statistics = { ...this.statistics, ...savedData.statistics };
                this.reputation = { ...this.reputation, ...savedData.reputation };
                this.transactionHistory = savedData.transactionHistory || [];

                // Restore shop inventories if they exist
                if (savedData.shops) {
                    Object.keys(this.shops).forEach(shopId => {
                        if (savedData.shops[shopId]) {
                            this.shops[shopId].items = savedData.shops[shopId].items || [];
                            this.shops[shopId].lastRefresh = savedData.shops[shopId].lastRefresh || 0;
                        }
                    });
                }
            }

            // Initialize shop inventories if empty
            Object.values(this.shops).forEach(shop => {
                if (shop.items.length === 0 || this.shouldRefreshShop(shop)) {
                    this.refreshShopInventory(shop.id);
                }
            });

            this.isInitialized = true;

            this.eventManager.emit('shop:initialized', {
                shops: this.getShopList(),
                reputation: this.reputation
            });

            console.log('ShopManager: Initialization complete');
        } catch (error) {
            console.error('ShopManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Purchase an item from a shop
     * @param {string} shopId - Shop identifier
     * @param {string} itemId - Item identifier within the shop
     * @param {number} quantity - Quantity to purchase
     * @returns {Object} Purchase result
     */
    purchaseItem(shopId, itemId, quantity = 1) {
        if (!this.isInitialized) {
            throw new Error('ShopManager not initialized');
        }

        const shop = this.shops[shopId];
        if (!shop) {
            return {
                success: false,
                reason: 'shop_not_found',
                message: 'Shop not found'
            };
        }

        const item = shop.items.find(i => i.id === itemId);
        if (!item) {
            return {
                success: false,
                reason: 'item_not_found',
                message: 'Item not found in shop'
            };
        }

        // Check stock
        if (item.stock < quantity) {
            return {
                success: false,
                reason: 'insufficient_stock',
                message: `Only ${item.stock} available`,
                availableStock: item.stock
            };
        }

        // Calculate final price with discounts
        const finalPrice = this.calculateFinalPrice(item, quantity);

        // Check if player can afford the item
        const affordabilityCheck = this.canAffordItem(finalPrice);
        if (!affordabilityCheck.canAfford) {
            return {
                success: false,
                reason: 'insufficient_funds',
                message: 'Not enough currency',
                required: finalPrice,
                available: affordabilityCheck.available,
                missing: affordabilityCheck.missing
            };
        }

        // Process the purchase
        this.processPayment(finalPrice);

        // Update item stock
        item.stock -= quantity;
        if (item.stock <= 0) {
            shop.items = shop.items.filter(i => i.id !== itemId);
        }

        // Give item to player
        this.giveItemToPlayer(item, quantity);

        // Update statistics and reputation
        this.updatePurchaseStatistics(finalPrice, item, quantity);
        this.addReputation(Math.floor(finalPrice.total / 10));

        // Record transaction
        const transaction = {
            id: Date.now().toString(),
            type: 'purchase',
            shopId: shopId,
            itemId: itemId,
            itemName: item.name,
            quantity: quantity,
            originalPrice: this.calculateBasePrice(item, quantity),
            finalPrice: finalPrice,
            discount: this.reputation.discount,
            timestamp: Date.now()
        };

        this.addTransaction(transaction);

        this.eventManager.emit('shop:item_purchased', {
            shopId: shopId,
            item: item,
            quantity: quantity,
            finalPrice: finalPrice,
            transaction: transaction
        });

        console.log(`ShopManager: Purchased ${item.name} x${quantity} for ${finalPrice.total} total cost`);

        return {
            success: true,
            item: item,
            quantity: quantity,
            finalPrice: finalPrice,
            transaction: transaction
        };
    }

    /**
     * Sell an item to a shop
     * @param {string} shopId - Shop identifier
     * @param {Object} item - Item to sell
     * @param {number} quantity - Quantity to sell
     * @returns {Object} Sale result
     */
    sellItem(shopId, item, quantity = 1) {
        if (!this.isInitialized) {
            throw new Error('ShopManager not initialized');
        }

        const shop = this.shops[shopId];
        if (!shop) {
            return {
                success: false,
                reason: 'shop_not_found',
                message: 'Shop not found'
            };
        }

        // Calculate sell price (typically 50-70% of buy price)
        const baseValue = item.value || 10;
        const sellMultiplier = 0.6 + (this.reputation.level * 0.02); // Better prices with higher reputation
        const sellPrice = Math.floor(baseValue * sellMultiplier * quantity);

        // Determine currency type based on item value
        const payment = this.determineSellPayment(sellPrice);

        // Process the sale
        this.processPayment(payment, false); // false = receiving money

        // Update statistics
        this.updateSellStatistics(payment, item, quantity);
        this.addReputation(Math.floor(sellPrice / 20));

        // Record transaction
        const transaction = {
            id: Date.now().toString(),
            type: 'sale',
            shopId: shopId,
            itemId: item.id,
            itemName: item.name,
            quantity: quantity,
            sellPrice: payment,
            reputationBonus: this.reputation.level,
            timestamp: Date.now()
        };

        this.addTransaction(transaction);

        this.eventManager.emit('shop:item_sold', {
            shopId: shopId,
            item: item,
            quantity: quantity,
            sellPrice: payment,
            transaction: transaction
        });

        console.log(`ShopManager: Sold ${item.name} x${quantity} for ${JSON.stringify(payment)}`);

        return {
            success: true,
            item: item,
            quantity: quantity,
            sellPrice: payment,
            transaction: transaction
        };
    }

    /**
     * Refresh a shop's inventory
     * @param {string} shopId - Shop identifier
     * @returns {Object} Refresh result
     */
    refreshShopInventory(shopId) {
        const shop = this.shops[shopId];
        if (!shop) {
            return { success: false, reason: 'shop_not_found' };
        }

        const newItems = this.generateShopInventory(shop);
        shop.items = newItems;
        shop.lastRefresh = Date.now();

        this.eventManager.emit('shop:inventory_refreshed', {
            shopId: shopId,
            itemCount: newItems.length
        });

        console.log(`ShopManager: Refreshed ${shop.name} inventory with ${newItems.length} items`);

        return {
            success: true,
            itemCount: newItems.length,
            items: newItems
        };
    }

    /**
     * Get shop inventory
     * @param {string} shopId - Shop identifier
     * @returns {Object} Shop data with inventory
     */
    getShopInventory(shopId) {
        const shop = this.shops[shopId];
        if (!shop) return null;

        // Check if shop needs refresh
        if (this.shouldRefreshShop(shop)) {
            this.refreshShopInventory(shopId);
        }

        return {
            ...shop,
            canRefresh: this.canManuallyRefresh(shop),
            nextAutoRefresh: shop.lastRefresh + shop.refreshInterval
        };
    }

    /**
     * Get all shops overview
     * @returns {Array} List of shops with basic info
     */
    getShopList() {
        return Object.values(this.shops).map(shop => ({
            id: shop.id,
            name: shop.name,
            description: shop.description,
            itemCount: shop.items.length,
            canRefresh: this.canManuallyRefresh(shop),
            nextAutoRefresh: shop.lastRefresh + shop.refreshInterval
        }));
    }

    /**
     * Get transaction history
     * @param {number} limit - Maximum number of transactions to return
     * @returns {Array} Recent transactions
     */
    getTransactionHistory(limit = 20) {
        return this.transactionHistory
            .slice(-limit)
            .reverse(); // Most recent first
    }

    /**
     * Get shop statistics
     * @returns {Object} Statistics data
     */
    getStatistics() {
        return {
            ...this.statistics,
            reputation: this.reputation
        };
    }

    /**
     * Get player reputation info
     * @returns {Object} Reputation data
     */
    getReputation() {
        return { ...this.reputation };
    }

    // Private methods

    /**
     * Generate inventory for a specific shop
     * @param {Object} shop - Shop data
     * @returns {Array} Generated items
     */
    generateShopInventory(shop) {
        const items = [];
        const itemCount = Math.floor(shop.maxItems * (0.7 + Math.random() * 0.3));

        for (let i = 0; i < itemCount; i++) {
            const item = this.generateShopItem(shop.id);
            if (item) {
                items.push(item);
            }
        }

        return items;
    }

    /**
     * Generate a single item for a shop
     * @param {string} shopId - Shop identifier
     * @returns {Object} Generated item
     */
    generateShopItem(shopId) {
        const itemTemplates = this.getItemTemplates(shopId);
        if (itemTemplates.length === 0) return null;

        const template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
        const item = { ...template };

        // Add unique ID and stock
        item.id = `${shopId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        item.stock = this.generateStock(item);

        // Add price variation (±20%)
        const priceVariation = 0.8 + (Math.random() * 0.4);
        if (item.prices) {
            Object.keys(item.prices).forEach(currency => {
                item.prices[currency] = Math.floor(item.prices[currency] * priceVariation);
            });
        }

        // Add quality variation for equipment
        if (item.type === 'equipment') {
            const qualityRoll = Math.random();
            if (qualityRoll > 0.9) {
                item.quality = 'superior';
                item.name = `Superior ${item.name}`;
                if (item.combatPower) item.combatPower *= 1.5;
                if (item.prices) {
                    Object.keys(item.prices).forEach(currency => {
                        item.prices[currency] *= 2;
                    });
                }
            } else if (qualityRoll > 0.7) {
                item.quality = 'high';
                item.name = `High Quality ${item.name}`;
                if (item.combatPower) item.combatPower *= 1.25;
                if (item.prices) {
                    Object.keys(item.prices).forEach(currency => {
                        item.prices[currency] *= 1.5;
                    });
                }
            }
        }

        return item;
    }

    /**
     * Get item templates for a specific shop
     * @param {string} shopId - Shop identifier
     * @returns {Array} Item templates
     */
    getItemTemplates(shopId) {
        const templates = {
            general: [
                {
                    name: 'Spirit Stone',
                    type: 'material',
                    description: 'A stone infused with spiritual energy',
                    prices: { spiritCrystals: 5 },
                    value: 5
                },
                {
                    name: 'Cultivation Pill',
                    type: 'consumable',
                    description: 'Aids in cultivation progress',
                    prices: { spiritCrystals: 20 },
                    value: 20,
                    effect: { cultivationBoost: 1.1, duration: 300000 }
                },
                {
                    name: 'Healing Pill',
                    type: 'consumable',
                    description: 'Restores health when consumed',
                    prices: { spiritCrystals: 15 },
                    value: 15,
                    effect: { healOverTime: 50, duration: 10000 }
                }
            ],
            scripture: [
                {
                    name: 'Basic Qi Manual',
                    type: 'scripture',
                    scriptureType: 'qi',
                    rarity: 1,
                    description: 'A basic manual for qi cultivation',
                    prices: { jade: 100, spiritCrystals: 200 },
                    value: 150,
                    stats: { damageMultiplier: 0.1 }
                },
                {
                    name: 'Iron Body Technique',
                    type: 'scripture',
                    scriptureType: 'body',
                    rarity: 2,
                    description: 'Strengthens the physical body',
                    prices: { jade: 200, spiritCrystals: 400 },
                    value: 300,
                    stats: { flatDamage: 10, damageReduction: 0.02 }
                }
            ],
            equipment: [
                {
                    name: 'Iron Sword',
                    type: 'equipment',
                    equipmentType: 'weapon',
                    description: 'A sturdy iron sword',
                    prices: { spiritCrystals: 100 },
                    value: 100,
                    combatPower: 20
                },
                {
                    name: 'Leather Armor',
                    type: 'equipment',
                    equipmentType: 'armor',
                    description: 'Basic leather protection',
                    prices: { spiritCrystals: 80 },
                    value: 80,
                    combatPower: 15,
                    stats: { damageReduction: 0.05 }
                }
            ],
            alchemy: [
                {
                    name: 'Spirit Herb',
                    type: 'material',
                    description: 'A herb with spiritual properties',
                    prices: { spiritCrystals: 3 },
                    value: 3
                },
                {
                    name: 'Beast Core',
                    type: 'material',
                    description: 'Core from a spiritual beast',
                    prices: { spiritCrystals: 25 },
                    value: 25
                },
                {
                    name: 'Qi Enhancement Pill',
                    type: 'consumable',
                    description: 'Temporarily enhances qi cultivation',
                    prices: { jade: 50, spiritCrystals: 100 },
                    value: 75,
                    effect: { qiMultiplier: 1.5, duration: 300000 }
                }
            ],
            rare: [
                {
                    name: 'Dragon Scale',
                    type: 'material',
                    description: 'A scale from an ancient dragon',
                    prices: { jade: 500, shards: 10 },
                    value: 750
                },
                {
                    name: 'Phoenix Feather',
                    type: 'material',
                    description: 'A feather from the immortal phoenix',
                    prices: { jade: 800, shards: 15 },
                    value: 1200
                },
                {
                    name: 'Immortal Technique Scroll',
                    type: 'scripture',
                    scriptureType: 'dual',
                    rarity: 5,
                    description: 'A legendary cultivation technique',
                    prices: { jade: 2000, shards: 50 },
                    value: 3000,
                    stats: { damageMultiplier: 0.5, critChance: 0.1 }
                }
            ]
        };

        return templates[shopId] || [];
    }

    /**
     * Generate stock amount for an item
     * @param {Object} item - Item data
     * @returns {number} Stock amount
     */
    generateStock(item) {
        if (item.type === 'material') {
            return Math.floor(5 + Math.random() * 20); // 5-25
        } else if (item.type === 'consumable') {
            return Math.floor(3 + Math.random() * 12); // 3-15
        } else if (item.type === 'scripture') {
            return Math.floor(1 + Math.random() * 3); // 1-3
        } else if (item.type === 'equipment') {
            return Math.floor(1 + Math.random() * 5); // 1-5
        }

        return 1;
    }

    /**
     * Check if shop should refresh automatically
     * @param {Object} shop - Shop data
     * @returns {boolean} Should refresh
     */
    shouldRefreshShop(shop) {
        const timeSinceRefresh = Date.now() - (shop.lastRefresh || 0);
        return timeSinceRefresh >= shop.refreshInterval;
    }

    /**
     * Check if player can manually refresh a shop
     * @param {Object} shop - Shop data
     * @returns {boolean} Can refresh
     */
    canManuallyRefresh(shop) {
        const timeSinceRefresh = Date.now() - (shop.lastRefresh || 0);
        return timeSinceRefresh >= (shop.refreshInterval * 0.5); // Can refresh at 50% of normal interval
    }

    /**
     * Calculate final price with discounts
     * @param {Object} item - Item data
     * @param {number} quantity - Quantity
     * @returns {Object} Price breakdown
     */
    calculateFinalPrice(item, quantity) {
        const basePrice = this.calculateBasePrice(item, quantity);
        const discount = this.reputation.discount;

        const finalPrice = {};
        let total = 0;

        Object.keys(basePrice).forEach(currency => {
            const originalAmount = basePrice[currency];
            const discountedAmount = Math.floor(originalAmount * (1 - discount));
            finalPrice[currency] = discountedAmount;
            total += discountedAmount;
        });

        return {
            ...finalPrice,
            total: total,
            originalTotal: Object.values(basePrice).reduce((sum, val) => sum + val, 0),
            discount: discount,
            savings: Object.values(basePrice).reduce((sum, val) => sum + val, 0) - total
        };
    }

    /**
     * Calculate base price for an item
     * @param {Object} item - Item data
     * @param {number} quantity - Quantity
     * @returns {Object} Base price by currency
     */
    calculateBasePrice(item, quantity) {
        const prices = {};

        Object.keys(item.prices).forEach(currency => {
            prices[currency] = item.prices[currency] * quantity;
        });

        return prices;
    }

    /**
     * Check if player can afford an item
     * @param {Object} price - Price breakdown
     * @returns {Object} Affordability result
     */
    canAffordItem(price) {
        const playerCurrencies = {
            jade: this.gameState.get('player.jade') || 0,
            spiritCrystals: this.gameState.get('player.spiritCrystals') || 0,
            shards: this.gameState.get('player.shards') || 0
        };

        const missing = {};
        let canAfford = true;

        Object.keys(price).forEach(currency => {
            if (currency === 'total' || currency === 'originalTotal' || currency === 'discount' || currency === 'savings') return;

            const required = price[currency] || 0;
            const available = playerCurrencies[currency] || 0;

            if (available < required) {
                canAfford = false;
                missing[currency] = required - available;
            }
        });

        return {
            canAfford: canAfford,
            available: playerCurrencies,
            missing: missing
        };
    }

    /**
     * Process payment (deduct from player currencies)
     * @param {Object} payment - Payment breakdown
     * @param {boolean} deduct - Whether to deduct (true) or add (false)
     */
    processPayment(payment, deduct = true) {
        const multiplier = deduct ? -1 : 1;

        Object.keys(payment).forEach(currency => {
            if (currency === 'total' || currency === 'originalTotal' || currency === 'discount' || currency === 'savings') return;

            const amount = (payment[currency] || 0) * multiplier;
            if (amount !== 0) {
                this.gameState.increment(`player.${currency}`, amount);
            }
        });
    }

    /**
     * Give purchased item to player
     * @param {Object} item - Item data
     * @param {number} quantity - Quantity
     */
    giveItemToPlayer(item, quantity) {
        // This would integrate with inventory system
        // For now, handle based on item type
        if (item.type === 'material') {
            // Add to crafting materials if CraftingSystem exists
            if (window.craftingSystem && window.craftingSystem.addMaterial) {
                window.craftingSystem.addMaterial(item.name.toLowerCase().replace(/\s+/g, '_'), quantity);
            }
        } else if (item.type === 'scripture') {
            // Add to scripture collection
            for (let i = 0; i < quantity; i++) {
                const scripture = this.convertItemToScripture(item);
                this.eventManager.emit('scripture:acquired', scripture);
            }
        } else if (item.type === 'consumable') {
            // Add to inventory (would be handled by inventory system)
            this.eventManager.emit('inventory:item_added', { item: item, quantity: quantity });
        } else if (item.type === 'equipment') {
            // Add to equipment storage
            this.eventManager.emit('equipment:item_added', { item: item, quantity: quantity });
        }
    }

    /**
     * Convert shop item to scripture format
     * @param {Object} item - Shop item
     * @returns {Object} Scripture object
     */
    convertItemToScripture(item) {
        return {
            name: item.name,
            type: item.scriptureType || 'qi',
            rarity: item.rarity || 1,
            level: 1,
            maxLevel: item.rarity * 10,
            stats: item.stats || {},
            description: item.description,
            equipped: false
        };
    }

    /**
     * Determine payment structure for selling items
     * @param {number} value - Item value
     * @returns {Object} Payment structure
     */
    determineSellPayment(value) {
        if (value >= 100) {
            // High value items give jade
            const jadeAmount = Math.floor(value / 10);
            const crystalAmount = value % 10;
            return crystalAmount > 0 ?
                { jade: jadeAmount, spiritCrystals: crystalAmount } :
                { jade: jadeAmount };
        } else {
            // Low value items give spirit crystals
            return { spiritCrystals: value };
        }
    }

    /**
     * Update purchase statistics
     * @param {Object} finalPrice - Final price paid
     * @param {Object} item - Item purchased
     * @param {number} quantity - Quantity purchased
     */
    updatePurchaseStatistics(finalPrice, item, quantity) {
        this.statistics.totalTransactions++;
        this.statistics.itemsPurchased += quantity;

        // Update spending by currency
        Object.keys(finalPrice).forEach(currency => {
            if (this.statistics.totalSpent[currency] !== undefined) {
                this.statistics.totalSpent[currency] += finalPrice[currency] || 0;
            }
        });

        // Track best deal (highest discount)
        if (!this.statistics.bestDeal || finalPrice.savings > this.statistics.bestDeal.savings) {
            this.statistics.bestDeal = {
                itemName: item.name,
                originalPrice: finalPrice.originalTotal,
                finalPrice: finalPrice.total,
                savings: finalPrice.savings,
                discount: finalPrice.discount,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Update sell statistics
     * @param {Object} payment - Payment received
     * @param {Object} item - Item sold
     * @param {number} quantity - Quantity sold
     */
    updateSellStatistics(payment, item, quantity) {
        this.statistics.totalTransactions++;
        this.statistics.itemsSold += quantity;

        // Update earnings by currency
        Object.keys(payment).forEach(currency => {
            if (this.statistics.totalEarned[currency] !== undefined) {
                this.statistics.totalEarned[currency] += payment[currency] || 0;
            }
        });
    }

    /**
     * Add reputation points
     * @param {number} points - Points to add
     */
    addReputation(points) {
        this.reputation.points += points;

        // Level up check
        while (this.reputation.points >= this.reputation.pointsRequired) {
            this.reputation.points -= this.reputation.pointsRequired;
            this.reputation.level++;
            this.reputation.pointsRequired = Math.floor(this.reputation.pointsRequired * 1.5);

            // Increase discount (max 25%)
            const newDiscount = Math.min(this.reputation.maxDiscount, this.reputation.level * 0.01);
            if (newDiscount > this.reputation.discount) {
                this.reputation.discount = newDiscount;

                this.eventManager.emit('shop:reputation_level_up', {
                    newLevel: this.reputation.level,
                    newDiscount: this.reputation.discount,
                    pointsRequired: this.reputation.pointsRequired
                });

                console.log(`ShopManager: Reputation leveled up to ${this.reputation.level} (${(this.reputation.discount * 100).toFixed(1)}% discount)`);
            }
        }
    }

    /**
     * Add transaction to history
     * @param {Object} transaction - Transaction data
     */
    addTransaction(transaction) {
        this.transactionHistory.push(transaction);

        // Maintain history size limit
        if (this.transactionHistory.length > this.maxHistorySize) {
            this.transactionHistory = this.transactionHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Save shop data to game state
     */
    saveData() {
        this.gameState.update({
            shop: {
                statistics: this.statistics,
                reputation: this.reputation,
                transactionHistory: this.transactionHistory,
                shops: Object.keys(this.shops).reduce((saved, shopId) => {
                    saved[shopId] = {
                        items: this.shops[shopId].items,
                        lastRefresh: this.shops[shopId].lastRefresh
                    };
                    return saved;
                }, {})
            }
        }, { source: 'shop:save' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopManager };
} else if (typeof window !== 'undefined') {
    window.ShopManager = ShopManager;
}