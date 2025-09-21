/**
 * SoulSystem - Soul cultivation and constellation system for CP progression
 * Provides soul development and constellation bonuses (6-9% of total CP)
 */
class SoulSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Initialize soul system state
        this.initializeState();

        console.log('SoulSystem: Initialized');
    }

    /**
     * Initialize soul system state in game state
     */
    initializeState() {
        if (!this.gameState.get('soul')) {
            this.gameState.set('soul', {
                essence: {
                    current: 0,
                    maximum: 100,
                    purity: 1.0,
                    density: 1.0
                },
                fragments: {},
                constellation: {
                    unlocked: [],
                    active: null,
                    stars: {},
                    connections: {}
                },
                tempering: null,
                refining: null,
                resources: {},
                unlocked: false
            });
        }
    }

    /**
     * Unlock the soul system (typically at Core Formation realm)
     */
    unlockSystem() {
        const soul = this.gameState.get('soul');
        soul.unlocked = true;

        // Initialize basic soul essence
        soul.essence.current = 10;
        soul.essence.maximum = 100;

        this.gameState.set('soul', soul);
        this.eventManager.emit('soulSystemUnlocked');

        console.log('SoulSystem: System unlocked');
    }

    /**
     * Check if soul system is unlocked
     */
    isUnlocked() {
        const cultivation = this.gameState.get('cultivation');
        const realm = cultivation?.realm || 'Body Refinement';

        // Unlock at Core Formation or higher
        const realms = ['Body Refinement', 'Qi Condensation', 'Foundation Establishment', 'Core Formation'];
        const realmIndex = realms.indexOf(realm);

        return realmIndex >= 3 || this.gameState.get('soul')?.unlocked;
    }

    /**
     * Start soul tempering to increase essence quality
     */
    startTempering() {
        const soul = this.gameState.get('soul');

        const requirements = this.getTemperingRequirements();

        if (!this.hasRequiredResources(requirements)) {
            console.warn(`SoulSystem: Insufficient resources for soul tempering`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        soul.tempering = {
            startTime: Date.now(),
            duration: this.getTemperingDuration(),
            targetPurity: soul.essence.purity + 0.1 + Math.random() * 0.1
        };

        this.gameState.set('soul', soul);
        this.eventManager.emit('soulTemperingStarted');

        console.log(`SoulSystem: Started soul tempering`);
        return true;
    }

    /**
     * Complete soul tempering
     */
    completeTempering() {
        const soul = this.gameState.get('soul');

        if (!soul.tempering) {
            return null;
        }

        const { startTime, duration, targetPurity } = soul.tempering;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Tempering not complete
        }

        // Apply tempering effects
        soul.essence.purity = targetPurity;
        soul.essence.maximum = Math.floor(soul.essence.maximum * 1.1); // 10% capacity increase

        // Clear tempering
        soul.tempering = null;

        this.gameState.set('soul', soul);
        this.eventManager.emit('soulTemperingCompleted', { newPurity: targetPurity });

        console.log(`SoulSystem: Completed soul tempering, new purity: ${targetPurity}`);
        return { newPurity: targetPurity };
    }

    /**
     * Start soul refining to increase essence density
     */
    startRefining() {
        const soul = this.gameState.get('soul');

        if (soul.essence.current < soul.essence.maximum * 0.8) {
            console.warn(`SoulSystem: Need at least 80% soul essence to refine`);
            return false;
        }

        const requirements = this.getRefiningRequirements();

        if (!this.hasRequiredResources(requirements)) {
            console.warn(`SoulSystem: Insufficient resources for soul refining`);
            return false;
        }

        // Consume resources and some essence
        this.consumeResources(requirements);
        soul.essence.current = Math.floor(soul.essence.current * 0.7); // Lose 30% essence

        soul.refining = {
            startTime: Date.now(),
            duration: this.getRefiningDuration(),
            targetDensity: soul.essence.density + 0.2 + Math.random() * 0.2
        };

        this.gameState.set('soul', soul);
        this.eventManager.emit('soulRefiningStarted');

        console.log(`SoulSystem: Started soul refining`);
        return true;
    }

    /**
     * Complete soul refining
     */
    completeRefining() {
        const soul = this.gameState.get('soul');

        if (!soul.refining) {
            return null;
        }

        const { startTime, duration, targetDensity } = soul.refining;
        const now = Date.now();

        if (now - startTime < duration) {
            return null; // Refining not complete
        }

        // Apply refining effects
        soul.essence.density = targetDensity;

        // Clear refining
        soul.refining = null;

        this.gameState.set('soul', soul);
        this.eventManager.emit('soulRefiningCompleted', { newDensity: targetDensity });

        console.log(`SoulSystem: Completed soul refining, new density: ${targetDensity}`);
        return { newDensity: targetDensity };
    }

    /**
     * Add soul fragment
     */
    addSoulFragment(fragmentId, quantity = 1) {
        const soul = this.gameState.get('soul');
        const fragmentData = this.getFragmentData(fragmentId);

        if (!fragmentData) {
            console.warn(`SoulSystem: Unknown soul fragment ${fragmentId}`);
            return false;
        }

        soul.fragments[fragmentId] = (soul.fragments[fragmentId] || 0) + quantity;

        this.gameState.set('soul', soul);
        this.eventManager.emit('soulFragmentAdded', { fragmentId, quantity });

        console.log(`SoulSystem: Added ${quantity} ${fragmentId} soul fragments`);
        return true;
    }

    /**
     * Unlock constellation
     */
    unlockConstellation(constellationId) {
        const soul = this.gameState.get('soul');
        const constellationData = this.getConstellationData(constellationId);

        if (!constellationData) {
            console.warn(`SoulSystem: Unknown constellation ${constellationId}`);
            return false;
        }

        // Check requirements
        const requirements = constellationData.requirements;
        if (!this.hasRequiredResources(requirements)) {
            console.warn(`SoulSystem: Insufficient resources for constellation ${constellationId}`);
            return false;
        }

        // Check soul essence requirements
        if (soul.essence.purity < constellationData.minPurity ||
            soul.essence.density < constellationData.minDensity) {
            console.warn(`SoulSystem: Soul essence not pure/dense enough for constellation ${constellationId}`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        // Unlock constellation
        if (!soul.constellation.unlocked.includes(constellationId)) {
            soul.constellation.unlocked.push(constellationId);
        }

        // Initialize stars
        constellationData.stars.forEach(starId => {
            if (!soul.constellation.stars[starId]) {
                soul.constellation.stars[starId] = {
                    id: starId,
                    active: false,
                    level: 0,
                    power: 0
                };
            }
        });

        this.gameState.set('soul', soul);
        this.eventManager.emit('constellationUnlocked', { constellationId });

        console.log(`SoulSystem: Unlocked constellation ${constellationId}`);
        return true;
    }

    /**
     * Activate constellation
     */
    activateConstellation(constellationId) {
        const soul = this.gameState.get('soul');

        if (!soul.constellation.unlocked.includes(constellationId)) {
            console.warn(`SoulSystem: Constellation ${constellationId} not unlocked`);
            return false;
        }

        soul.constellation.active = constellationId;

        this.gameState.set('soul', soul);
        this.eventManager.emit('constellationActivated', { constellationId });

        console.log(`SoulSystem: Activated constellation ${constellationId}`);
        return true;
    }

    /**
     * Enhance constellation star
     */
    enhanceStar(starId) {
        const soul = this.gameState.get('soul');
        const star = soul.constellation.stars[starId];

        if (!star) {
            console.warn(`SoulSystem: Star ${starId} not found`);
            return false;
        }

        const starData = this.getStarData(starId);
        if (!starData) {
            console.warn(`SoulSystem: Unknown star data for ${starId}`);
            return false;
        }

        const requirements = this.getStarEnhancementRequirements(starId, star.level);

        if (!this.hasRequiredResources(requirements)) {
            console.warn(`SoulSystem: Insufficient resources for star enhancement`);
            return false;
        }

        // Consume resources
        this.consumeResources(requirements);

        // Enhance star
        star.level += 1;
        star.power = this.calculateStarPower(starId, star.level);

        if (!star.active && star.level >= 1) {
            star.active = true;
        }

        this.gameState.set('soul', soul);
        this.eventManager.emit('starEnhanced', { starId, newLevel: star.level, newPower: star.power });

        console.log(`SoulSystem: Enhanced star ${starId} to level ${star.level}`);
        return true;
    }

    /**
     * Get total soul power contribution
     */
    getSoulPower() {
        const soul = this.gameState.get('soul');

        if (!soul) {
            return 0;
        }

        let totalPower = 0;

        // Base soul essence power
        const essencePower = soul.essence.current * soul.essence.purity * soul.essence.density * 2;
        totalPower += essencePower;

        // Constellation power
        if (soul.constellation.active) {
            const constellationData = this.getConstellationData(soul.constellation.active);
            if (constellationData) {
                // Base constellation power
                totalPower += constellationData.basePower;

                // Star power
                constellationData.stars.forEach(starId => {
                    const star = soul.constellation.stars[starId];
                    if (star && star.active) {
                        totalPower += star.power;
                    }
                });

                // Connection bonuses
                const connectionBonus = this.calculateConnectionBonuses(soul.constellation.active);
                totalPower += connectionBonus;
            }
        }

        return Math.floor(totalPower);
    }

    /**
     * Calculate star power based on level
     */
    calculateStarPower(starId, level) {
        const starData = this.getStarData(starId);

        if (!starData) {
            return 0;
        }

        return starData.basePower + (level - 1) * starData.powerPerLevel;
    }

    /**
     * Calculate connection bonuses between stars
     */
    calculateConnectionBonuses(constellationId) {
        const soul = this.gameState.get('soul');
        const constellationData = this.getConstellationData(constellationId);

        if (!constellationData) {
            return 0;
        }

        let bonusPercent = 0;

        // Count active stars
        const activeStars = constellationData.stars.filter(starId => {
            const star = soul.constellation.stars[starId];
            return star && star.active;
        }).length;

        // Connection bonuses based on active stars
        if (activeStars >= 3) bonusPercent += 10; // 10% bonus for 3+ stars
        if (activeStars >= 5) bonusPercent += 15; // Additional 15% for 5+ stars
        if (activeStars >= 7) bonusPercent += 25; // Additional 25% for 7+ stars

        // Full constellation bonus
        if (activeStars === constellationData.stars.length) {
            bonusPercent += constellationData.fullSetBonus || 50;
        }

        const basePower = this.getSoulPower();
        return Math.floor(basePower * bonusPercent / 100);
    }

    /**
     * Get tempering requirements
     */
    getTemperingRequirements() {
        const soul = this.gameState.get('soul');
        const purityLevel = Math.floor(soul.essence.purity * 10);

        return {
            soul_crystals: 5 + purityLevel,
            spirit_stones: 100 + purityLevel * 20,
            tempering_flames: 1 + Math.floor(purityLevel / 5)
        };
    }

    /**
     * Get refining requirements
     */
    getRefiningRequirements() {
        const soul = this.gameState.get('soul');
        const densityLevel = Math.floor(soul.essence.density * 10);

        return {
            soul_crystals: 10 + densityLevel * 2,
            spirit_stones: 200 + densityLevel * 50,
            refining_cores: 2 + Math.floor(densityLevel / 3)
        };
    }

    /**
     * Get star enhancement requirements
     */
    getStarEnhancementRequirements(starId, currentLevel) {
        const starData = this.getStarData(starId);

        if (!starData) {
            return {};
        }

        const levelMultiplier = Math.pow(1.5, currentLevel);

        return {
            soul_crystals: Math.floor(starData.baseCost * levelMultiplier),
            star_essence: Math.floor(starData.essenceCost * levelMultiplier),
            spirit_stones: Math.floor(starData.stoneCost * levelMultiplier)
        };
    }

    /**
     * Get tempering duration
     */
    getTemperingDuration() {
        return 480000; // 8 minutes
    }

    /**
     * Get refining duration
     */
    getRefiningDuration() {
        return 720000; // 12 minutes
    }

    /**
     * Check if player has required resources
     */
    hasRequiredResources(requirements) {
        const soul = this.gameState.get('soul');

        for (const [resource, amount] of Object.entries(requirements)) {
            const available = soul.resources[resource] || 0;
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
        const soul = this.gameState.get('soul');

        for (const [resource, amount] of Object.entries(requirements)) {
            soul.resources[resource] = (soul.resources[resource] || 0) - amount;
        }

        this.gameState.set('soul', soul);
    }

    /**
     * Add resources to inventory
     */
    addResources(resourceId, amount) {
        const soul = this.gameState.get('soul');
        soul.resources[resourceId] = (soul.resources[resourceId] || 0) + amount;

        this.gameState.set('soul', soul);
        this.eventManager.emit('soulResourcesAdded', { resourceId, amount });
    }

    /**
     * Get soul fragment data
     */
    getFragmentData(fragmentId) {
        const fragmentsData = {
            mortal_fragment: {
                name: 'Mortal Soul Fragment',
                description: 'Fragment from a mortal soul',
                rarity: 'Common',
                power: 5,
                uses: ['tempering', 'basic_enchantment']
            },
            cultivator_fragment: {
                name: 'Cultivator Soul Fragment',
                description: 'Fragment from a cultivator\'s soul',
                rarity: 'Uncommon',
                power: 15,
                uses: ['tempering', 'refining', 'star_enhancement']
            },
            beast_fragment: {
                name: 'Spirit Beast Fragment',
                description: 'Fragment from a powerful spirit beast',
                rarity: 'Rare',
                power: 35,
                uses: ['refining', 'constellation_unlock', 'star_enhancement']
            },
            divine_fragment: {
                name: 'Divine Soul Fragment',
                description: 'Fragment containing divine essence',
                rarity: 'Legendary',
                power: 100,
                uses: ['constellation_unlock', 'divine_enhancement']
            }
        };

        return fragmentsData[fragmentId] || null;
    }

    /**
     * Get constellation data
     */
    getConstellationData(constellationId) {
        const constellationsData = {
            warrior_constellation: {
                name: 'Warrior Constellation',
                description: 'Grants strength and combat prowess',
                basePower: 80,
                minPurity: 2.0,
                minDensity: 1.5,
                stars: ['ares_star', 'sword_star', 'shield_star', 'victory_star', 'battle_star'],
                fullSetBonus: 40,
                requirements: {
                    soul_crystals: 50,
                    warrior_essence: 10,
                    spirit_stones: 500
                },
                element: 'Fire'
            },

            scholar_constellation: {
                name: 'Scholar Constellation',
                description: 'Enhances wisdom and spiritual perception',
                basePower: 60,
                minPurity: 2.5,
                minDensity: 1.3,
                stars: ['wisdom_star', 'knowledge_star', 'insight_star', 'clarity_star', 'truth_star'],
                fullSetBonus: 50,
                requirements: {
                    soul_crystals: 40,
                    scholar_essence: 8,
                    spirit_stones: 400
                },
                element: 'Light'
            },

            beast_constellation: {
                name: 'Beast Constellation',
                description: 'Channels primal beast power',
                basePower: 120,
                minPurity: 1.8,
                minDensity: 2.0,
                stars: ['tiger_star', 'dragon_star', 'phoenix_star', 'turtle_star', 'serpent_star', 'wolf_star', 'eagle_star'],
                fullSetBonus: 60,
                requirements: {
                    soul_crystals: 80,
                    beast_essence: 15,
                    spirit_stones: 800
                },
                element: 'Earth'
            },

            celestial_constellation: {
                name: 'Celestial Constellation',
                description: 'Connects to heavenly powers',
                basePower: 200,
                minPurity: 3.0,
                minDensity: 2.5,
                stars: ['sun_star', 'moon_star', 'venus_star', 'mars_star', 'jupiter_star', 'saturn_star', 'mercury_star', 'north_star'],
                fullSetBonus: 100,
                requirements: {
                    soul_crystals: 150,
                    celestial_essence: 25,
                    divine_crystals: 5,
                    spirit_stones: 1500
                },
                element: 'Divine'
            }
        };

        return constellationsData[constellationId] || null;
    }

    /**
     * Get star data
     */
    getStarData(starId) {
        const starsData = {
            // Warrior constellation stars
            ares_star: { name: 'Ares Star', basePower: 25, powerPerLevel: 8, baseCost: 10, essenceCost: 2, stoneCost: 50 },
            sword_star: { name: 'Sword Star', basePower: 20, powerPerLevel: 6, baseCost: 8, essenceCost: 2, stoneCost: 40 },
            shield_star: { name: 'Shield Star', basePower: 30, powerPerLevel: 10, baseCost: 12, essenceCost: 3, stoneCost: 60 },
            victory_star: { name: 'Victory Star', basePower: 35, powerPerLevel: 12, baseCost: 15, essenceCost: 4, stoneCost: 75 },
            battle_star: { name: 'Battle Star', basePower: 40, powerPerLevel: 15, baseCost: 18, essenceCost: 5, stoneCost: 90 },

            // Scholar constellation stars
            wisdom_star: { name: 'Wisdom Star', basePower: 22, powerPerLevel: 7, baseCost: 9, essenceCost: 2, stoneCost: 45 },
            knowledge_star: { name: 'Knowledge Star', basePower: 18, powerPerLevel: 5, baseCost: 7, essenceCost: 1, stoneCost: 35 },
            insight_star: { name: 'Insight Star', basePower: 28, powerPerLevel: 9, baseCost: 11, essenceCost: 3, stoneCost: 55 },
            clarity_star: { name: 'Clarity Star', basePower: 32, powerPerLevel: 11, baseCost: 14, essenceCost: 4, stoneCost: 70 },
            truth_star: { name: 'Truth Star', basePower: 38, powerPerLevel: 14, baseCost: 17, essenceCost: 5, stoneCost: 85 },

            // Beast constellation stars
            tiger_star: { name: 'Tiger Star', basePower: 30, powerPerLevel: 10, baseCost: 12, essenceCost: 3, stoneCost: 60 },
            dragon_star: { name: 'Dragon Star', basePower: 50, powerPerLevel: 18, baseCost: 20, essenceCost: 6, stoneCost: 100 },
            phoenix_star: { name: 'Phoenix Star', basePower: 45, powerPerLevel: 16, baseCost: 18, essenceCost: 5, stoneCost: 90 },
            turtle_star: { name: 'Turtle Star', basePower: 35, powerPerLevel: 12, baseCost: 14, essenceCost: 4, stoneCost: 70 },
            serpent_star: { name: 'Serpent Star', basePower: 28, powerPerLevel: 9, baseCost: 11, essenceCost: 3, stoneCost: 55 },
            wolf_star: { name: 'Wolf Star', basePower: 32, powerPerLevel: 11, baseCost: 13, essenceCost: 3, stoneCost: 65 },
            eagle_star: { name: 'Eagle Star', basePower: 38, powerPerLevel: 14, baseCost: 15, essenceCost: 4, stoneCost: 75 },

            // Celestial constellation stars
            sun_star: { name: 'Sun Star', basePower: 60, powerPerLevel: 22, baseCost: 25, essenceCost: 8, stoneCost: 125 },
            moon_star: { name: 'Moon Star', basePower: 55, powerPerLevel: 20, baseCost: 22, essenceCost: 7, stoneCost: 110 },
            venus_star: { name: 'Venus Star', basePower: 42, powerPerLevel: 15, baseCost: 17, essenceCost: 5, stoneCost: 85 },
            mars_star: { name: 'Mars Star', basePower: 48, powerPerLevel: 18, baseCost: 19, essenceCost: 6, stoneCost: 95 },
            jupiter_star: { name: 'Jupiter Star', basePower: 52, powerPerLevel: 19, baseCost: 21, essenceCost: 7, stoneCost: 105 },
            saturn_star: { name: 'Saturn Star', basePower: 45, powerPerLevel: 16, baseCost: 18, essenceCost: 6, stoneCost: 90 },
            mercury_star: { name: 'Mercury Star', basePower: 38, powerPerLevel: 14, baseCost: 15, essenceCost: 5, stoneCost: 75 },
            north_star: { name: 'North Star', basePower: 70, powerPerLevel: 25, baseCost: 30, essenceCost: 10, stoneCost: 150 }
        };

        return starsData[starId] || null;
    }

    /**
     * Get soul system status for UI display
     */
    getSystemStatus() {
        const soul = this.gameState.get('soul');

        return {
            unlocked: this.isUnlocked(),
            totalPower: this.getSoulPower(),
            essence: soul?.essence || {},
            temperingInProgress: !!soul?.tempering,
            temperingTimeRemaining: soul?.tempering ?
                Math.max(0, (soul.tempering.startTime + soul.tempering.duration) - Date.now()) : 0,
            refiningInProgress: !!soul?.refining,
            refiningTimeRemaining: soul?.refining ?
                Math.max(0, (soul.refining.startTime + soul.refining.duration) - Date.now()) : 0,
            activeConstellation: soul?.constellation?.active || null,
            unlockedConstellations: soul?.constellation?.unlocked?.length || 0,
            activeStars: Object.values(soul?.constellation?.stars || {}).filter(star => star.active).length,
            fragments: soul?.fragments || {},
            resources: soul?.resources || {}
        };
    }

    /**
     * Process soul-related idle gains
     */
    processIdleGains(timeElapsed) {
        const soul = this.gameState.get('soul');

        // Check tempering completion
        if (soul?.tempering) {
            const tempering = soul.tempering;
            const temperingEndTime = tempering.startTime + tempering.duration;
            const now = Date.now();

            if (now >= temperingEndTime) {
                const result = this.completeTempering();
                if (result) {
                    console.log(`SoulSystem: Auto-completed soul tempering during idle time`);
                }
            }
        }

        // Check refining completion
        if (soul?.refining) {
            const refining = soul.refining;
            const refiningEndTime = refining.startTime + refining.duration;
            const now = Date.now();

            if (now >= refiningEndTime) {
                const result = this.completeRefining();
                if (result) {
                    console.log(`SoulSystem: Auto-completed soul refining during idle time`);
                }
            }
        }

        // Passive soul essence generation
        if (soul?.essence && this.isUnlocked()) {
            const passiveGain = Math.floor(timeElapsed / 60000) * soul.essence.purity; // 1 per minute * purity
            const maxGain = soul.essence.maximum - soul.essence.current;
            const actualGain = Math.min(passiveGain, maxGain);

            if (actualGain > 0) {
                soul.essence.current += actualGain;
                this.gameState.set('soul', soul);
                console.log(`SoulSystem: Generated ${actualGain} soul essence during idle time`);
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoulSystem };
} else if (typeof window !== 'undefined') {
    window.SoulSystem = SoulSystem;
}