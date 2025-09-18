/**
 * Sect Data - Definitions for sect types, roles, activities, and configurations
 * Contains all static data for the sect system including hierarchies and benefits
 */

// Sect role hierarchy with permissions and benefits
const SECT_ROLES = {
    "Sect Master": {
        id: "sect_master",
        level: 5,
        maxMembers: 1,
        permissions: [
            "manage_sect",
            "invite_members",
            "kick_members",
            "promote_members",
            "demote_members",
            "set_announcements",
            "manage_treasury",
            "declare_war",
            "form_alliances",
            "set_sect_policies",
            "access_all_facilities"
        ],
        benefits: {
            contributionMultiplier: 2.0,
            cultivationBonus: 0.5,
            resourceSharing: 1.0,
            prestigeGain: 2.0
        },
        requirements: {
            minCultivationLevel: 100,
            minContribution: 10000,
            founder: true
        }
    },
    "Elder": {
        id: "elder",
        level: 4,
        maxMembers: 5,
        permissions: [
            "invite_members",
            "kick_outer_disciples",
            "promote_to_core",
            "set_announcements",
            "manage_missions",
            "access_treasury_view",
            "moderate_chat",
            "organize_activities"
        ],
        benefits: {
            contributionMultiplier: 1.5,
            cultivationBonus: 0.3,
            resourceSharing: 0.8,
            prestigeGain: 1.5
        },
        requirements: {
            minCultivationLevel: 75,
            minContribution: 5000,
            timeInSect: 7 * 24 * 60 * 60 * 1000 // 7 days
        }
    },
    "Core Disciple": {
        id: "core_disciple",
        level: 3,
        maxMembers: 20,
        permissions: [
            "invite_members",
            "access_sect_library",
            "participate_all_activities",
            "vote_on_policies",
            "mentor_outer_disciples"
        ],
        benefits: {
            contributionMultiplier: 1.3,
            cultivationBonus: 0.2,
            resourceSharing: 0.6,
            prestigeGain: 1.2
        },
        requirements: {
            minCultivationLevel: 50,
            minContribution: 2000,
            timeInSect: 3 * 24 * 60 * 60 * 1000 // 3 days
        }
    },
    "Outer Disciple": {
        id: "outer_disciple",
        level: 2,
        maxMembers: 100,
        permissions: [
            "participate_basic_activities",
            "access_basic_library",
            "contribute_resources",
            "use_sect_chat"
        ],
        benefits: {
            contributionMultiplier: 1.1,
            cultivationBonus: 0.1,
            resourceSharing: 0.3,
            prestigeGain: 1.0
        },
        requirements: {
            minCultivationLevel: 10,
            minContribution: 100,
            timeInSect: 0
        }
    },
    "Probationary Disciple": {
        id: "probationary",
        level: 1,
        maxMembers: 50,
        permissions: [
            "participate_basic_activities",
            "contribute_resources",
            "use_sect_chat"
        ],
        benefits: {
            contributionMultiplier: 1.0,
            cultivationBonus: 0.05,
            resourceSharing: 0.1,
            prestigeGain: 0.5
        },
        requirements: {
            minCultivationLevel: 0,
            minContribution: 0,
            timeInSect: 0
        }
    }
};

// Sect types with different focuses and bonuses
const SECT_TYPES = {
    "Orthodox Sect": {
        id: "orthodox",
        description: "Traditional cultivation sect focused on balanced progression",
        maxMembers: 200,
        foundingCost: {
            jade: 100000,
            spiritCrystals: 10000,
            minFounders: 1
        },
        specialties: ["balanced_cultivation", "technique_research", "resource_gathering"],
        bonuses: {
            cultivationSpeed: 0.15,
            techniqueEfficiency: 0.2,
            resourceGeneration: 0.1,
            memberCapacity: 1.0
        },
        facilities: {
            required: ["sect_hall", "cultivation_chambers"],
            optional: ["library", "alchemy_lab", "training_grounds", "treasury"]
        }
    },
    "Demonic Sect": {
        id: "demonic",
        description: "Aggressive sect focused on power and conquest",
        maxMembers: 150,
        foundingCost: {
            jade: 80000,
            spiritCrystals: 15000,
            minFounders: 1
        },
        specialties: ["combat_prowess", "territory_expansion", "fear_tactics"],
        bonuses: {
            combatPower: 0.25,
            territoryGains: 0.3,
            intimidationEffect: 0.2,
            memberCapacity: 0.75
        },
        facilities: {
            required: ["sect_hall", "war_room"],
            optional: ["torture_chambers", "demon_altar", "blood_pool", "arsenal"]
        }
    },
    "Righteous Alliance": {
        id: "righteous",
        description: "Cooperative alliance focused on justice and protection",
        maxMembers: 300,
        foundingCost: {
            jade: 120000,
            spiritCrystals: 8000,
            minFounders: 3
        },
        specialties: ["cooperative_cultivation", "mutual_aid", "demon_suppression"],
        bonuses: {
            cooperationBonus: 0.3,
            defenseBonus: 0.2,
            healingEfficiency: 0.25,
            memberCapacity: 1.5
        },
        facilities: {
            required: ["sect_hall", "council_chamber", "healing_pavilion"],
            optional: ["shrine", "meditation_garden", "academy", "guest_quarters"]
        }
    },
    "Merchant Guild": {
        id: "merchant",
        description: "Commerce-focused organization emphasizing trade and wealth",
        maxMembers: 250,
        foundingCost: {
            jade: 150000,
            spiritCrystals: 5000,
            minFounders: 2
        },
        specialties: ["resource_trading", "wealth_accumulation", "market_manipulation"],
        bonuses: {
            tradeEfficiency: 0.4,
            resourceMultiplier: 0.3,
            negotiationBonus: 0.2,
            memberCapacity: 1.25
        },
        facilities: {
            required: ["sect_hall", "trading_post", "vault"],
            optional: ["marketplace", "caravan_station", "bank", "auction_house"]
        }
    },
    "Hermit Sect": {
        id: "hermit",
        description: "Secluded sect focused on personal enlightenment",
        maxMembers: 50,
        foundingCost: {
            jade: 50000,
            spiritCrystals: 20000,
            minFounders: 1
        },
        specialties: ["deep_meditation", "enlightenment_seeking", "isolation_benefits"],
        bonuses: {
            meditationEfficiency: 0.5,
            enlightenmentChance: 0.3,
            solitudeBonus: 0.4,
            memberCapacity: 0.25
        },
        facilities: {
            required: ["sect_hall", "meditation_caves"],
            optional: ["hermitage", "spirit_garden", "wisdom_library", "reflection_pool"]
        }
    }
};

// Sect facilities and their benefits
const SECT_FACILITIES = {
    "sect_hall": {
        id: "sect_hall",
        name: "Sect Hall",
        description: "Central building for sect administration and ceremonies",
        cost: { jade: 10000, spiritCrystals: 1000 },
        maintenanceCost: { jade: 100, spiritCrystals: 10 },
        required: true,
        benefits: {
            memberCapacity: 50,
            prestigeGeneration: 1.0,
            administrationEfficiency: 1.0
        },
        upgrades: {
            1: { cost: { jade: 5000, spiritCrystals: 500 }, benefits: { memberCapacity: 25, prestigeGeneration: 0.2 } },
            2: { cost: { jade: 15000, spiritCrystals: 1500 }, benefits: { memberCapacity: 50, prestigeGeneration: 0.3 } },
            3: { cost: { jade: 30000, spiritCrystals: 3000 }, benefits: { memberCapacity: 75, prestigeGeneration: 0.5 } }
        }
    },
    "cultivation_chambers": {
        id: "cultivation_chambers",
        name: "Cultivation Chambers",
        description: "Specialized rooms for enhanced cultivation practice",
        cost: { jade: 15000, spiritCrystals: 2000 },
        maintenanceCost: { jade: 150, spiritCrystals: 20 },
        required: false,
        benefits: {
            cultivationSpeedBonus: 0.2,
            breakthroughChance: 0.1,
            qiCapacityBonus: 0.15
        }
    },
    "library": {
        id: "library",
        name: "Sect Library",
        description: "Repository of techniques, knowledge, and wisdom",
        cost: { jade: 12000, spiritCrystals: 1500 },
        maintenanceCost: { jade: 120, spiritCrystals: 15 },
        required: false,
        benefits: {
            techniqueEfficiency: 0.15,
            researchSpeed: 0.3,
            knowledgeSharing: 0.2
        }
    },
    "training_grounds": {
        id: "training_grounds",
        name: "Training Grounds",
        description: "Areas for combat practice and martial arts training",
        cost: { jade: 8000, spiritCrystals: 800 },
        maintenanceCost: { jade: 80, spiritCrystals: 8 },
        required: false,
        benefits: {
            combatSkillGain: 0.25,
            sparringBonuses: 0.2,
            injuryReduction: 0.15
        }
    },
    "alchemy_lab": {
        id: "alchemy_lab",
        name: "Alchemy Laboratory",
        description: "Facility for pill refinement and potion brewing",
        cost: { jade: 20000, spiritCrystals: 3000 },
        maintenanceCost: { jade: 200, spiritCrystals: 30 },
        required: false,
        benefits: {
            pillEfficiency: 0.3,
            alchemySkillGain: 0.4,
            resourceSynthesis: 0.2
        }
    },
    "treasury": {
        id: "treasury",
        name: "Sect Treasury",
        description: "Secure storage for sect resources and treasures",
        cost: { jade: 25000, spiritCrystals: 2500 },
        maintenanceCost: { jade: 250, spiritCrystals: 25 },
        required: false,
        benefits: {
            resourceSecurity: 1.0,
            interestGeneration: 0.05,
            storageCapacity: 2.0
        }
    }
};

// Collaborative cultivation activities
const SECT_ACTIVITIES = {
    "group_meditation": {
        id: "group_meditation",
        name: "Group Meditation Session",
        description: "Collective meditation to enhance spiritual awareness",
        requirements: {
            minParticipants: 3,
            maxParticipants: 20,
            minRole: "probationary",
            duration: 30 * 60 * 1000, // 30 minutes
            cooldown: 2 * 60 * 60 * 1000 // 2 hours
        },
        benefits: {
            participants: {
                qiGainMultiplier: 1.5,
                cultivationSpeedBonus: 0.2,
                harmonyPoints: 10
            },
            sect: {
                cohesionIncrease: 5,
                prestigeGain: 2
            }
        },
        cost: {
            jade: 100,
            spiritCrystals: 10
        }
    },
    "technique_sharing": {
        id: "technique_sharing",
        name: "Technique Sharing Circle",
        description: "Exchange and learn techniques from fellow sect members",
        requirements: {
            minParticipants: 2,
            maxParticipants: 10,
            minRole: "outer_disciple",
            duration: 60 * 60 * 1000, // 1 hour
            cooldown: 6 * 60 * 60 * 1000 // 6 hours
        },
        benefits: {
            participants: {
                techniqueXpGain: 200,
                learningSpeedBonus: 0.3,
                knowledgePoints: 15
            },
            sect: {
                knowledgePool: 10,
                innovationPoints: 5
            }
        },
        cost: {
            jade: 200,
            spiritCrystals: 20
        }
    },
    "resource_gathering": {
        id: "resource_gathering",
        name: "Collective Resource Gathering",
        description: "Organize expeditions to gather cultivation resources",
        requirements: {
            minParticipants: 5,
            maxParticipants: 30,
            minRole: "outer_disciple",
            duration: 2 * 60 * 60 * 1000, // 2 hours
            cooldown: 12 * 60 * 60 * 1000 // 12 hours
        },
        benefits: {
            participants: {
                resourceFindBonus: 0.5,
                gatheringSpeedBonus: 0.3,
                teamworkPoints: 20
            },
            sect: {
                resourceStockpile: 100,
                explorationProgress: 10
            }
        },
        cost: {
            jade: 500,
            spiritCrystals: 50
        }
    },
    "formation_training": {
        id: "formation_training",
        name: "Formation Battle Training",
        description: "Practice coordinated battle formations",
        requirements: {
            minParticipants: 8,
            maxParticipants: 50,
            minRole: "core_disciple",
            duration: 90 * 60 * 1000, // 90 minutes
            cooldown: 24 * 60 * 60 * 1000 // 24 hours
        },
        benefits: {
            participants: {
                formationSkillGain: 30,
                tacticalBonus: 0.25,
                coordinationPoints: 25
            },
            sect: {
                militaryStrength: 20,
                defenseRating: 15
            }
        },
        cost: {
            jade: 1000,
            spiritCrystals: 100
        }
    },
    "sect_tournament": {
        id: "sect_tournament",
        name: "Internal Sect Tournament",
        description: "Competitive tournament to determine the strongest disciples",
        requirements: {
            minParticipants: 10,
            maxParticipants: 100,
            minRole: "outer_disciple",
            duration: 4 * 60 * 60 * 1000, // 4 hours
            cooldown: 7 * 24 * 60 * 60 * 1000 // 7 days
        },
        benefits: {
            participants: {
                combatXpGain: 500,
                competitiveSpirit: 50,
                rivalryPoints: 30
            },
            winners: {
                prestigeBonus: 100,
                rewardMultiplier: 2.0,
                titleGain: true
            },
            sect: {
                prestigeGain: 50,
                combatReadiness: 25
            }
        },
        cost: {
            jade: 2000,
            spiritCrystals: 200
        }
    }
};

// Inter-sect competition events
const COMPETITION_EVENTS = {
    "sect_war": {
        id: "sect_war",
        name: "Sect War",
        description: "Full-scale conflict between sects for territory and resources",
        duration: 7 * 24 * 60 * 60 * 1000, // 7 days
        participants: {
            min: 2,
            max: 4
        },
        requirements: {
            minMembers: 20,
            declaration: 24 * 60 * 60 * 1000, // 24 hour declaration period
            cooldown: 30 * 24 * 60 * 60 * 1000 // 30 days
        },
        phases: [
            {
                name: "Preparation",
                duration: 2 * 24 * 60 * 60 * 1000,
                activities: ["strategy_planning", "resource_mobilization", "alliance_forming"]
            },
            {
                name: "Skirmishes",
                duration: 3 * 24 * 60 * 60 * 1000,
                activities: ["border_raids", "supply_disruption", "reconnaissance"]
            },
            {
                name: "Final Battle",
                duration: 2 * 24 * 60 * 60 * 1000,
                activities: ["main_assault", "territory_capture", "victory_conditions"]
            }
        ],
        rewards: {
            winner: {
                territory: 1,
                prestige: 1000,
                resources: { jade: 50000, spiritCrystals: 5000 },
                titles: ["Victorious Sect"]
            },
            participants: {
                prestige: 200,
                warExperience: 100,
                battleHardened: true
            }
        }
    },
    "grand_tournament": {
        id: "grand_tournament",
        name: "Grand Cultivation Tournament",
        description: "Cross-sect tournament to determine the most skilled cultivators",
        duration: 3 * 24 * 60 * 60 * 1000, // 3 days
        participants: {
            min: 3,
            max: 10
        },
        requirements: {
            minMembers: 10,
            entryFee: { jade: 10000, spiritCrystals: 1000 },
            cooldown: 90 * 24 * 60 * 60 * 1000 // 90 days
        },
        categories: [
            {
                name: "Qi Cultivation",
                description: "Pure qi cultivation and manipulation skills",
                participants: "qi_cultivators"
            },
            {
                name: "Body Refinement",
                description: "Physical prowess and body cultivation mastery",
                participants: "body_cultivators"
            },
            {
                name: "Dual Cultivation",
                description: "Balanced cultivation of both qi and body",
                participants: "dual_cultivators"
            },
            {
                name: "Technique Mastery",
                description: "Demonstration of advanced cultivation techniques",
                participants: "technique_masters"
            }
        ],
        rewards: {
            champion: {
                prestige: 2000,
                title: "Grand Tournament Champion",
                resources: { jade: 100000, spiritCrystals: 10000 },
                specialReward: "tournament_artifact"
            },
            finalist: {
                prestige: 1000,
                resources: { jade: 50000, spiritCrystals: 5000 }
            },
            participant: {
                prestige: 200,
                experience: 500
            }
        }
    },
    "resource_competition": {
        id: "resource_competition",
        name: "Resource Gathering Competition",
        description: "Competitive resource gathering across multiple locations",
        duration: 24 * 60 * 60 * 1000, // 1 day
        participants: {
            min: 2,
            max: 8
        },
        requirements: {
            minMembers: 15,
            surveyFee: { jade: 5000, spiritCrystals: 500 },
            cooldown: 14 * 24 * 60 * 60 * 1000 // 14 days
        },
        locations: [
            "spirit_stone_mines",
            "herb_gardens",
            "crystal_caves",
            "ancient_ruins"
        ],
        scoring: {
            resourceQuantity: 0.4,
            resourceQuality: 0.3,
            efficiency: 0.2,
            teamwork: 0.1
        },
        rewards: {
            winner: {
                prestige: 500,
                resources: { jade: 25000, spiritCrystals: 2500 },
                territoryAccess: "winner_exclusive_area"
            },
            participants: {
                prestige: 100,
                resources: { jade: 5000, spiritCrystals: 500 }
            }
        }
    }
};

// Sect diplomacy relations and their effects
const DIPLOMACY_RELATIONS = {
    "alliance": {
        id: "alliance",
        name: "Alliance",
        description: "Formal military and economic partnership",
        benefits: {
            tradeBonus: 0.2,
            defenseMutualAid: true,
            resourceSharing: 0.1,
            jointActivities: true
        },
        restrictions: {
            warDeclaration: false,
            territoryDisputes: false,
            memberPoaching: false
        },
        requirements: {
            minPrestige: 1000,
            trustLevel: 75,
            nonAggression: 30 * 24 * 60 * 60 * 1000
        }
    },
    "trade_agreement": {
        id: "trade_agreement",
        name: "Trade Agreement",
        description: "Economic partnership for resource exchange",
        benefits: {
            tradeBonus: 0.15,
            reducedTradeCosts: 0.2,
            marketAccess: true,
            caravanProtection: true
        },
        restrictions: {
            tradeTariffs: false,
            tradeBlocks: false
        },
        requirements: {
            minPrestige: 500,
            trustLevel: 50,
            economicStability: true
        }
    },
    "non_aggression": {
        id: "non_aggression",
        name: "Non-Aggression Pact",
        description: "Agreement to avoid hostile actions",
        benefits: {
            peacefulBorders: true,
            neutralMeditation: 0.1,
            diplomaticImmunity: true
        },
        restrictions: {
            warDeclaration: false,
            territoryEncroachment: false,
            memberKidnapping: false
        },
        requirements: {
            minPrestige: 200,
            trustLevel: 25
        }
    },
    "rivalry": {
        id: "rivalry",
        name: "Rivalry",
        description: "Competitive but not hostile relationship",
        benefits: {
            competitiveBonus: 0.1,
            challengeAvailability: true,
            prestigeFromVictories: 1.5
        },
        restrictions: {
            formalAlliances: false,
            resourceSharing: false
        },
        requirements: {
            similarPower: true,
            competitiveHistory: true
        }
    },
    "hostility": {
        id: "hostility",
        name: "Hostility",
        description: "Open antagonism and preparation for conflict",
        benefits: {
            warPreparation: 0.2,
            militaryFocus: 0.3,
            warDeclarationReady: true
        },
        restrictions: {
            peacefulInteraction: false,
            trade: false,
            memberExchange: false
        },
        requirements: {
            conflictHistory: true,
            ideologicalDifferences: true
        }
    },
    "war": {
        id: "war",
        name: "War",
        description: "Active state of warfare",
        benefits: {
            combatBonus: 0.3,
            territoryConquest: true,
            spoilsOfWar: true
        },
        restrictions: {
            allPeacefulInteraction: false,
            neutrality: false
        },
        requirements: {
            warDeclaration: true,
            sufficientForces: true
        }
    }
};

// Sect achievements and milestones
const SECT_ACHIEVEMENTS = {
    "founder": {
        id: "founder",
        name: "Sect Founder",
        description: "Established a new sect",
        requirements: { sectCreated: true },
        rewards: { prestige: 1000, title: "Sect Founder" },
        permanent: true
    },
    "first_elder": {
        id: "first_elder",
        name: "First Elder",
        description: "Promoted first member to Elder status",
        requirements: { eldersPromoted: 1 },
        rewards: { prestige: 500, leadershipBonus: 0.1 },
        permanent: true
    },
    "hundred_strong": {
        id: "hundred_strong",
        name: "Hundred Strong",
        description: "Grew sect to 100 members",
        requirements: { memberCount: 100 },
        rewards: { prestige: 2000, capacityBonus: 50 },
        permanent: true
    },
    "first_victory": {
        id: "first_victory",
        name: "First Victory",
        description: "Won first inter-sect competition",
        requirements: { competitionsWon: 1 },
        rewards: { prestige: 1500, combatBonus: 0.1 },
        permanent: true
    },
    "master_diplomat": {
        id: "master_diplomat",
        name: "Master Diplomat",
        description: "Established 5 alliances",
        requirements: { alliancesFormed: 5 },
        rewards: { prestige: 3000, diplomacyBonus: 0.2 },
        permanent: true
    },
    "territory_lord": {
        id: "territory_lord",
        name: "Territory Lord",
        description: "Controls 10 territories",
        requirements: { territoriesControlled: 10 },
        rewards: { prestige: 5000, territoryBonuses: 0.3 },
        permanent: true
    }
};

// Export all sect data for use by the sect system
export {
    SECT_ROLES,
    SECT_TYPES,
    SECT_FACILITIES,
    SECT_ACTIVITIES,
    COMPETITION_EVENTS,
    DIPLOMACY_RELATIONS,
    SECT_ACHIEVEMENTS
};

// Global window exports for non-module environments
if (typeof window !== 'undefined') {
    window.SECT_ROLES = SECT_ROLES;
    window.SECT_TYPES = SECT_TYPES;
    window.SECT_FACILITIES = SECT_FACILITIES;
    window.SECT_ACTIVITIES = SECT_ACTIVITIES;
    window.COMPETITION_EVENTS = COMPETITION_EVENTS;
    window.DIPLOMACY_RELATIONS = DIPLOMACY_RELATIONS;
    window.SECT_ACHIEVEMENTS = SECT_ACHIEVEMENTS;
}