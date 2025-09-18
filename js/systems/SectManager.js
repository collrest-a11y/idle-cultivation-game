/**
 * SectManager - Advanced sect operations and member management
 * Handles member promotion/demotion, sect policies, facilities, and administration
 */
class SectManager {
    constructor(gameState, eventManager, sectSystem) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.sectSystem = sectSystem;

        // Management state
        this.managementState = {
            pendingPromotions: new Map(),
            pendingApplications: new Map(),
            disciplinaryActions: new Map(),
            facilityProjects: new Map()
        };

        // Permission cache for performance
        this.permissionCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        // Activity tracking
        this.memberActivity = new Map();
        this.inactivityThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

        this.isInitialized = false;

        console.log('SectManager: Initialized');
    }

    /**
     * Initialize the sect manager
     */
    async initialize() {
        try {
            // Load management state
            const savedState = this.gameState.get('sectManagement');
            if (savedState) {
                this.managementState = {
                    ...this.managementState,
                    pendingPromotions: new Map(savedState.pendingPromotions || []),
                    pendingApplications: new Map(savedState.pendingApplications || []),
                    disciplinaryActions: new Map(savedState.disciplinaryActions || []),
                    facilityProjects: new Map(savedState.facilityProjects || [])
                };
            }

            // Load activity tracking
            const savedActivity = this.gameState.get('memberActivity');
            if (savedActivity) {
                this.memberActivity = new Map(savedActivity);
            }

            // Set up event listeners
            this._setupEventListeners();

            this.isInitialized = true;
            console.log('SectManager: Initialization complete');
            return true;

        } catch (error) {
            console.error('SectManager: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Promote a member to a higher role
     * @param {string} memberId - Member to promote
     * @param {string} newRole - Target role
     * @param {string} reason - Reason for promotion
     * @returns {Object} Promotion result
     */
    async promoteMember(memberId, newRole, reason = '') {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this._checkPermission('promote_members');
            if (!hasPermission) {
                return this._error('Insufficient permissions to promote members', 'NO_PERMISSION');
            }

            // Get member data
            const member = currentSect.members.get(memberId);
            if (!member) {
                return this._error('Member not found', 'MEMBER_NOT_FOUND');
            }

            // Validate promotion
            const validation = this._validatePromotion(member, newRole);
            if (!validation.valid) {
                return this._error(validation.reason, 'PROMOTION_INVALID');
            }

            const oldRole = member.role;
            const oldRoleData = window.SECT_ROLES[oldRole];
            const newRoleData = window.SECT_ROLES[newRole];

            // Check role capacity
            const currentRoleCount = this._countMembersInRole(currentSect, newRole);
            if (currentRoleCount >= newRoleData.maxMembers) {
                return this._error(`Maximum ${newRoleData.name} positions filled`, 'ROLE_CAPACITY_FULL');
            }

            // Update member role
            member.role = newRole;
            member.promotedAt = Date.now();
            member.promotedBy = this._getPlayerInfo().id;
            member.promotionReason = reason;

            // Update sect member data
            currentSect.members.set(memberId, member);

            // Clear permission cache for this member
            this._clearPermissionCache(memberId);

            // Log promotion activity
            this._logActivity(currentSect.id, 'member_promoted', {
                memberId: memberId,
                memberName: member.name,
                oldRole: oldRole,
                newRole: newRole,
                promotedBy: this._getPlayerInfo().name,
                reason: reason
            });

            // Save state
            this._saveState();

            // Emit promotion event
            this.eventManager.emit('sect:memberPromoted', {
                sectId: currentSect.id,
                memberId: memberId,
                member: member,
                oldRole: oldRole,
                newRole: newRole,
                promotedBy: this._getPlayerInfo(),
                reason: reason
            });

            console.log(`SectManager: Promoted ${member.name} from ${oldRoleData.name} to ${newRoleData.name}`);

            return {
                success: true,
                message: `Successfully promoted ${member.name} to ${newRoleData.name}`,
                member: member,
                oldRole: oldRole,
                newRole: newRole
            };

        } catch (error) {
            console.error('SectManager: Member promotion failed:', error);
            return this._error(error.message, 'PROMOTION_FAILED');
        }
    }

    /**
     * Demote a member to a lower role
     * @param {string} memberId - Member to demote
     * @param {string} newRole - Target role
     * @param {string} reason - Reason for demotion
     * @returns {Object} Demotion result
     */
    async demoteMember(memberId, newRole, reason = '') {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this._checkPermission('demote_members');
            if (!hasPermission) {
                return this._error('Insufficient permissions to demote members', 'NO_PERMISSION');
            }

            // Get member data
            const member = currentSect.members.get(memberId);
            if (!member) {
                return this._error('Member not found', 'MEMBER_NOT_FOUND');
            }

            // Validate demotion
            const validation = this._validateDemotion(member, newRole);
            if (!validation.valid) {
                return this._error(validation.reason, 'DEMOTION_INVALID');
            }

            const oldRole = member.role;
            const oldRoleData = window.SECT_ROLES[oldRole];
            const newRoleData = window.SECT_ROLES[newRole];

            // Update member role
            member.role = newRole;
            member.demotedAt = Date.now();
            member.demotedBy = this._getPlayerInfo().id;
            member.demotionReason = reason;

            // Update sect member data
            currentSect.members.set(memberId, member);

            // Clear permission cache for this member
            this._clearPermissionCache(memberId);

            // Log demotion activity
            this._logActivity(currentSect.id, 'member_demoted', {
                memberId: memberId,
                memberName: member.name,
                oldRole: oldRole,
                newRole: newRole,
                demotedBy: this._getPlayerInfo().name,
                reason: reason
            });

            // Save state
            this._saveState();

            // Emit demotion event
            this.eventManager.emit('sect:memberDemoted', {
                sectId: currentSect.id,
                memberId: memberId,
                member: member,
                oldRole: oldRole,
                newRole: newRole,
                demotedBy: this._getPlayerInfo(),
                reason: reason
            });

            console.log(`SectManager: Demoted ${member.name} from ${oldRoleData.name} to ${newRoleData.name}`);

            return {
                success: true,
                message: `Successfully demoted ${member.name} to ${newRoleData.name}`,
                member: member,
                oldRole: oldRole,
                newRole: newRole
            };

        } catch (error) {
            console.error('SectManager: Member demotion failed:', error);
            return this._error(error.message, 'DEMOTION_FAILED');
        }
    }

    /**
     * Kick a member from the sect
     * @param {string} memberId - Member to kick
     * @param {string} reason - Reason for kicking
     * @returns {Object} Kick result
     */
    async kickMember(memberId, reason = '') {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this._checkPermission('kick_members');
            if (!hasPermission) {
                return this._error('Insufficient permissions to kick members', 'NO_PERMISSION');
            }

            // Get member data
            const member = currentSect.members.get(memberId);
            if (!member) {
                return this._error('Member not found', 'MEMBER_NOT_FOUND');
            }

            // Validate kick
            const validation = this._validateKick(member);
            if (!validation.valid) {
                return this._error(validation.reason, 'KICK_INVALID');
            }

            const memberName = member.name;
            const memberRole = member.role;

            // Remove member from sect
            currentSect.members.delete(memberId);
            currentSect.memberCount--;

            // Clear member activity tracking
            this.memberActivity.delete(memberId);

            // Clear permission cache for this member
            this._clearPermissionCache(memberId);

            // Log kick activity
            this._logActivity(currentSect.id, 'member_kicked', {
                memberId: memberId,
                memberName: memberName,
                memberRole: memberRole,
                kickedBy: this._getPlayerInfo().name,
                reason: reason
            });

            // Save state
            this._saveState();

            // Emit kick event
            this.eventManager.emit('sect:memberKicked', {
                sectId: currentSect.id,
                memberId: memberId,
                memberName: memberName,
                memberRole: memberRole,
                kickedBy: this._getPlayerInfo(),
                reason: reason
            });

            console.log(`SectManager: Kicked ${memberName} from sect`);

            return {
                success: true,
                message: `Successfully kicked ${memberName} from the sect`,
                memberName: memberName,
                reason: reason
            };

        } catch (error) {
            console.error('SectManager: Member kick failed:', error);
            return this._error(error.message, 'KICK_FAILED');
        }
    }

    /**
     * Set sect announcement
     * @param {string} message - Announcement message
     * @param {number} priority - Priority level (1-5)
     * @returns {Object} Announcement result
     */
    async setSectAnnouncement(message, priority = 1) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this._checkPermission('set_announcements');
            if (!hasPermission) {
                return this._error('Insufficient permissions to set announcements', 'NO_PERMISSION');
            }

            // Validate message
            if (!message || message.trim().length === 0) {
                return this._error('Announcement message cannot be empty', 'INVALID_MESSAGE');
            }

            if (message.length > 500) {
                return this._error('Announcement message too long (max 500 characters)', 'MESSAGE_TOO_LONG');
            }

            // Create announcement
            const announcement = {
                id: `announcement_${Date.now()}`,
                message: message.trim(),
                priority: Math.max(1, Math.min(5, priority)),
                createdBy: this._getPlayerInfo(),
                createdAt: Date.now(),
                active: true
            };

            // Add to sect announcements
            if (!currentSect.announcements) {
                currentSect.announcements = [];
            }

            // Remove old announcements if too many
            if (currentSect.announcements.length >= 10) {
                currentSect.announcements = currentSect.announcements.slice(-9);
            }

            currentSect.announcements.push(announcement);

            // Log announcement activity
            this._logActivity(currentSect.id, 'announcement_set', {
                announcementId: announcement.id,
                message: message,
                priority: priority,
                createdBy: this._getPlayerInfo().name
            });

            // Save state
            this._saveState();

            // Emit announcement event
            this.eventManager.emit('sect:announcementSet', {
                sectId: currentSect.id,
                announcement: announcement
            });

            console.log(`SectManager: Set sect announcement: "${message}"`);

            return {
                success: true,
                message: 'Announcement set successfully',
                announcement: announcement
            };

        } catch (error) {
            console.error('SectManager: Set announcement failed:', error);
            return this._error(error.message, 'ANNOUNCEMENT_FAILED');
        }
    }

    /**
     * Update sect policies
     * @param {Object} policies - Policy updates
     * @returns {Object} Update result
     */
    async updateSectPolicies(policies) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this._checkPermission('set_sect_policies');
            if (!hasPermission) {
                return this._error('Insufficient permissions to update policies', 'NO_PERMISSION');
            }

            // Validate policies
            const validation = this._validatePolicies(policies);
            if (!validation.valid) {
                return this._error(validation.reason, 'INVALID_POLICIES');
            }

            const oldPolicies = { ...currentSect.policies };

            // Update policies
            currentSect.policies = {
                ...currentSect.policies,
                ...policies,
                lastUpdated: Date.now(),
                updatedBy: this._getPlayerInfo().id
            };

            // Log policy update
            this._logActivity(currentSect.id, 'policies_updated', {
                oldPolicies: oldPolicies,
                newPolicies: policies,
                updatedBy: this._getPlayerInfo().name
            });

            // Save state
            this._saveState();

            // Emit policy update event
            this.eventManager.emit('sect:policiesUpdated', {
                sectId: currentSect.id,
                oldPolicies: oldPolicies,
                newPolicies: currentSect.policies,
                updatedBy: this._getPlayerInfo()
            });

            console.log('SectManager: Updated sect policies');

            return {
                success: true,
                message: 'Sect policies updated successfully',
                policies: currentSect.policies
            };

        } catch (error) {
            console.error('SectManager: Policy update failed:', error);
            return this._error(error.message, 'POLICY_UPDATE_FAILED');
        }
    }

    /**
     * Construct or upgrade a sect facility
     * @param {string} facilityId - Facility to construct/upgrade
     * @param {Object} options - Construction options
     * @returns {Object} Construction result
     */
    async constructFacility(facilityId, options = {}) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this._checkPermission('manage_sect');
            if (!hasPermission) {
                return this._error('Insufficient permissions to manage facilities', 'NO_PERMISSION');
            }

            // Get facility data
            const facilityData = window.SECT_FACILITIES[facilityId];
            if (!facilityData) {
                return this._error('Invalid facility type', 'INVALID_FACILITY');
            }

            // Check if facility already exists
            const existingFacility = currentSect.facilities.get(facilityId);
            const isUpgrade = !!existingFacility;

            let cost, newLevel;

            if (isUpgrade) {
                // Calculate upgrade cost
                const currentLevel = existingFacility.level || 1;
                const upgradeData = facilityData.upgrades && facilityData.upgrades[currentLevel];

                if (!upgradeData) {
                    return this._error('Facility cannot be upgraded further', 'MAX_LEVEL_REACHED');
                }

                cost = upgradeData.cost;
                newLevel = currentLevel + 1;
            } else {
                // New construction
                cost = facilityData.cost;
                newLevel = 1;
            }

            // Check if sect can afford the cost
            const canAfford = this._checkSectResources(currentSect, cost);
            if (!canAfford.valid) {
                return this._error(`Insufficient sect resources: ${canAfford.missing.join(', ')}`, 'INSUFFICIENT_RESOURCES');
            }

            // Deduct cost from sect treasury
            this._deductSectResources(currentSect, cost);

            // Create or upgrade facility
            const facility = {
                id: facilityId,
                level: newLevel,
                ...facilityData,
                constructedAt: isUpgrade ? existingFacility.constructedAt : Date.now(),
                lastUpgraded: Date.now(),
                constructedBy: this._getPlayerInfo().id
            };

            currentSect.facilities.set(facilityId, facility);

            // Log construction activity
            this._logActivity(currentSect.id, isUpgrade ? 'facility_upgraded' : 'facility_constructed', {
                facilityId: facilityId,
                facilityName: facilityData.name,
                level: newLevel,
                cost: cost,
                constructedBy: this._getPlayerInfo().name
            });

            // Save state
            this._saveState();

            // Emit facility event
            this.eventManager.emit(isUpgrade ? 'sect:facilityUpgraded' : 'sect:facilityConstructed', {
                sectId: currentSect.id,
                facilityId: facilityId,
                facility: facility,
                cost: cost,
                constructedBy: this._getPlayerInfo()
            });

            const action = isUpgrade ? 'upgraded' : 'constructed';
            console.log(`SectManager: ${action} facility ${facilityData.name} (level ${newLevel})`);

            return {
                success: true,
                message: `Successfully ${action} ${facilityData.name}`,
                facility: facility,
                cost: cost,
                isUpgrade: isUpgrade
            };

        } catch (error) {
            console.error('SectManager: Facility construction failed:', error);
            return this._error(error.message, 'CONSTRUCTION_FAILED');
        }
    }

    /**
     * Get sect member list with filtering and sorting
     * @param {Object} options - List options
     * @returns {Array} Member list
     */
    getMemberList(options = {}) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) {
            return [];
        }

        const {
            sortBy = 'joinedAt',
            sortOrder = 'desc',
            filterRole = null,
            filterActive = null,
            includeOffline = true
        } = options;

        let members = Array.from(currentSect.members.values());

        // Apply filters
        if (filterRole) {
            members = members.filter(member => member.role === filterRole);
        }

        if (filterActive !== null) {
            const now = Date.now();
            members = members.filter(member => {
                const lastActive = this.memberActivity.get(member.id) || member.lastActive || 0;
                const isActive = (now - lastActive) < this.inactivityThreshold;
                return filterActive ? isActive : !isActive;
            });
        }

        if (!includeOffline) {
            const now = Date.now();
            members = members.filter(member => {
                const lastActive = this.memberActivity.get(member.id) || member.lastActive || 0;
                return (now - lastActive) < (60 * 60 * 1000); // Online in last hour
            });
        }

        // Sort members
        members.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'role':
                    aValue = window.SECT_ROLES[a.role]?.level || 0;
                    bValue = window.SECT_ROLES[b.role]?.level || 0;
                    break;
                case 'contribution':
                    aValue = a.contribution || 0;
                    bValue = b.contribution || 0;
                    break;
                case 'cultivationLevel':
                    aValue = a.cultivationLevel || 0;
                    bValue = b.cultivationLevel || 0;
                    break;
                case 'joinedAt':
                default:
                    aValue = a.joinedAt || 0;
                    bValue = b.joinedAt || 0;
                    break;
            }

            if (sortOrder === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });

        return members.map(member => ({
            ...member,
            roleData: window.SECT_ROLES[member.role],
            isOnline: this._isMemberOnline(member.id),
            lastActiveFormatted: this._formatLastActive(member.id)
        }));
    }

    /**
     * Get sect activity log
     * @param {Object} options - Log options
     * @returns {Array} Activity log
     */
    getActivityLog(options = {}) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) {
            return [];
        }

        const {
            limit = 50,
            activityType = null,
            memberId = null,
            startDate = null,
            endDate = null
        } = options;

        let activities = currentSect.activityLog || [];

        // Apply filters
        if (activityType) {
            activities = activities.filter(activity => activity.type === activityType);
        }

        if (memberId) {
            activities = activities.filter(activity =>
                activity.data.memberId === memberId ||
                activity.data.createdBy === memberId
            );
        }

        if (startDate) {
            activities = activities.filter(activity => activity.timestamp >= startDate);
        }

        if (endDate) {
            activities = activities.filter(activity => activity.timestamp <= endDate);
        }

        // Sort by timestamp (newest first)
        activities.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit
        return activities.slice(0, limit);
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Listen for member activity to track online status
        this.eventManager.on('cultivation:experienceGained', (data) => {
            this._trackMemberActivity();
        });

        this.eventManager.on('sect:memberJoined', (data) => {
            this._onMemberJoined(data);
        });

        this.eventManager.on('sect:memberLeft', (data) => {
            this._onMemberLeft(data);
        });
    }

    /**
     * Check if player has specific permission
     * @param {string} permission - Permission to check
     * @returns {boolean} Has permission
     */
    _checkPermission(permission) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) {
            return false;
        }

        const playerRole = currentSect.playerRole;
        if (!playerRole) {
            return false;
        }

        // Check cache first
        const cacheKey = `${playerRole}_${permission}`;
        const cached = this.permissionCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.hasPermission;
        }

        // Calculate permission
        const roleData = window.SECT_ROLES[playerRole];
        const hasPermission = roleData && roleData.permissions && roleData.permissions.includes(permission);

        // Cache result
        this.permissionCache.set(cacheKey, {
            hasPermission: hasPermission,
            timestamp: Date.now()
        });

        return hasPermission;
    }

    /**
     * Clear permission cache for a member
     * @param {string} memberId - Member ID
     */
    _clearPermissionCache(memberId) {
        // For now, just clear all cache since we don't track per-member
        this.permissionCache.clear();
    }

    /**
     * Validate member promotion
     * @param {Object} member - Member to promote
     * @param {string} newRole - Target role
     * @returns {Object} Validation result
     */
    _validatePromotion(member, newRole) {
        const currentRoleData = window.SECT_ROLES[member.role];
        const newRoleData = window.SECT_ROLES[newRole];

        if (!newRoleData) {
            return { valid: false, reason: 'Invalid target role' };
        }

        if (newRoleData.level <= currentRoleData.level) {
            return { valid: false, reason: 'Cannot promote to same or lower role' };
        }

        // Check if member meets requirements
        if (newRoleData.requirements) {
            const requirements = newRoleData.requirements;

            if (requirements.minCultivationLevel && member.cultivationLevel < requirements.minCultivationLevel) {
                return { valid: false, reason: 'Member does not meet cultivation level requirement' };
            }

            if (requirements.minContribution && member.contribution < requirements.minContribution) {
                return { valid: false, reason: 'Member does not meet contribution requirement' };
            }

            if (requirements.timeInSect) {
                const timeInSect = Date.now() - member.joinedAt;
                if (timeInSect < requirements.timeInSect) {
                    return { valid: false, reason: 'Member has not been in sect long enough' };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Validate member demotion
     * @param {Object} member - Member to demote
     * @param {string} newRole - Target role
     * @returns {Object} Validation result
     */
    _validateDemotion(member, newRole) {
        const currentRoleData = window.SECT_ROLES[member.role];
        const newRoleData = window.SECT_ROLES[newRole];

        if (!newRoleData) {
            return { valid: false, reason: 'Invalid target role' };
        }

        if (newRoleData.level >= currentRoleData.level) {
            return { valid: false, reason: 'Cannot demote to same or higher role' };
        }

        // Cannot demote sect master if they are the only one
        if (member.role === 'sect_master') {
            const currentSect = this.sectSystem.getCurrentSect();
            const sectMasterCount = this._countMembersInRole(currentSect, 'sect_master');
            if (sectMasterCount <= 1) {
                return { valid: false, reason: 'Cannot demote the only sect master' };
            }
        }

        return { valid: true };
    }

    /**
     * Validate member kick
     * @param {Object} member - Member to kick
     * @returns {Object} Validation result
     */
    _validateKick(member) {
        // Cannot kick sect master
        if (member.role === 'sect_master') {
            return { valid: false, reason: 'Cannot kick the sect master' };
        }

        // Check if kicker has sufficient authority
        const currentSect = this.sectSystem.getCurrentSect();
        const playerRole = currentSect.playerRole;
        const playerRoleData = window.SECT_ROLES[playerRole];
        const memberRoleData = window.SECT_ROLES[member.role];

        if (playerRoleData.level <= memberRoleData.level) {
            return { valid: false, reason: 'Cannot kick members of equal or higher rank' };
        }

        return { valid: true };
    }

    /**
     * Validate sect policies
     * @param {Object} policies - Policies to validate
     * @returns {Object} Validation result
     */
    _validatePolicies(policies) {
        // Validate recruitment policy
        if (policies.recruitment && !['open', 'invitation', 'closed'].includes(policies.recruitment)) {
            return { valid: false, reason: 'Invalid recruitment policy' };
        }

        // Validate membership fees
        if (policies.membershipFees) {
            for (const [resource, amount] of Object.entries(policies.membershipFees)) {
                if (typeof amount !== 'number' || amount < 0) {
                    return { valid: false, reason: 'Invalid membership fee amount' };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Count members in a specific role
     * @param {Object} sect - Sect object
     * @param {string} role - Role to count
     * @returns {number} Member count
     */
    _countMembersInRole(sect, role) {
        let count = 0;
        for (const member of sect.members.values()) {
            if (member.role === role) {
                count++;
            }
        }
        return count;
    }

    /**
     * Check if sect has sufficient resources
     * @param {Object} sect - Sect object
     * @param {Object} cost - Resource requirements
     * @returns {Object} Availability check
     */
    _checkSectResources(sect, cost) {
        const missing = [];

        for (const [resource, amount] of Object.entries(cost)) {
            const available = sect.treasury[resource] || 0;
            if (available < amount) {
                missing.push(`${resource}: ${amount - available} needed`);
            }
        }

        return {
            valid: missing.length === 0,
            missing: missing
        };
    }

    /**
     * Deduct resources from sect treasury
     * @param {Object} sect - Sect object
     * @param {Object} cost - Resources to deduct
     */
    _deductSectResources(sect, cost) {
        for (const [resource, amount] of Object.entries(cost)) {
            sect.treasury[resource] = Math.max(0, (sect.treasury[resource] || 0) - amount);
        }
    }

    /**
     * Log activity to sect activity log
     * @param {string} sectId - Sect ID
     * @param {string} type - Activity type
     * @param {Object} data - Activity data
     */
    _logActivity(sectId, type, data) {
        const sect = this.sectSystem.sectRegistry.get(sectId);
        if (!sect) return;

        if (!sect.activityLog) {
            sect.activityLog = [];
        }

        const activity = {
            id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            timestamp: Date.now(),
            data: data
        };

        sect.activityLog.push(activity);

        // Keep only recent activities (last 1000)
        if (sect.activityLog.length > 1000) {
            sect.activityLog = sect.activityLog.slice(-1000);
        }
    }

    /**
     * Track member activity
     */
    _trackMemberActivity() {
        const playerId = this._getPlayerInfo().id;
        this.memberActivity.set(playerId, Date.now());
    }

    /**
     * Check if member is online
     * @param {string} memberId - Member ID
     * @returns {boolean} Is online
     */
    _isMemberOnline(memberId) {
        const lastActive = this.memberActivity.get(memberId) || 0;
        return (Date.now() - lastActive) < (5 * 60 * 1000); // Online if active in last 5 minutes
    }

    /**
     * Format last active time
     * @param {string} memberId - Member ID
     * @returns {string} Formatted time
     */
    _formatLastActive(memberId) {
        const lastActive = this.memberActivity.get(memberId) || 0;
        if (lastActive === 0) return 'Never';

        const timeDiff = Date.now() - lastActive;
        const minutes = Math.floor(timeDiff / (60 * 1000));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    /**
     * Get player information
     * @returns {Object} Player info
     */
    _getPlayerInfo() {
        return {
            id: 'player',
            name: 'Player'
        };
    }

    /**
     * Save current state
     */
    _saveState() {
        this.gameState.update({
            sectManagement: {
                pendingPromotions: Array.from(this.managementState.pendingPromotions.entries()),
                pendingApplications: Array.from(this.managementState.pendingApplications.entries()),
                disciplinaryActions: Array.from(this.managementState.disciplinaryActions.entries()),
                facilityProjects: Array.from(this.managementState.facilityProjects.entries())
            },
            memberActivity: Array.from(this.memberActivity.entries())
        }, { source: 'SectManager' });
    }

    /**
     * Handle member joined event
     * @param {Object} data - Event data
     */
    _onMemberJoined(data) {
        // Track new member activity
        this.memberActivity.set(data.member.id, Date.now());
    }

    /**
     * Handle member left event
     * @param {Object} data - Event data
     */
    _onMemberLeft(data) {
        // Clean up member activity tracking
        this.memberActivity.delete(data.member.id);
    }

    /**
     * Create error result
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @returns {Object} Error result
     */
    _error(message, code) {
        return {
            success: false,
            error: message,
            code: code
        };
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SectManager };
} else if (typeof window !== 'undefined') {
    window.SectManager = SectManager;
}